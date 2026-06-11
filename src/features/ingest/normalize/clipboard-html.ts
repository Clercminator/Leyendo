const removableElementSelector = [
  "script",
  "style",
  "link",
  "meta",
  "noscript",
  "template",
  "iframe",
  "object",
  "embed",
  "form",
  "button",
  "input",
  "select",
  "textarea",
  "svg",
  "canvas",
  "video",
  "audio",
  "source",
  "nav",
  "aside",
  "header",
  "footer",
  "[hidden]",
  '[aria-hidden="true"]',
  '[role="toolbar"]',
  '[role="menu"]',
  '[role="menuitem"]',
  '[role="navigation"]',
  '[role="button"]',
].join(",");

const explicitUrlSchemePattern = /^[a-z][a-z0-9+.-]*:/i;
const safeUrlSchemePattern = /^(?:https?|mailto):/i;
const hiddenStylePattern =
  /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)(?:\s*!important)?\s*(?:;|$)/i;
const languageClassPattern = /(?:^|\s)language-([A-Za-z0-9_-]+)(?:\s|$)/;

function replaceImagesWithAltText(root: HTMLElement) {
  root.querySelectorAll("img").forEach((image) => {
    const altText = image.getAttribute("alt")?.trim();

    if (!altText) {
      image.remove();
      return;
    }

    image.replaceWith(image.ownerDocument.createTextNode(`Image: ${altText}`));
  });
}

function removeUnsafeAndDecorativeElements(root: HTMLElement) {
  root.querySelectorAll(removableElementSelector).forEach((element) => {
    element.remove();
  });

  root.querySelectorAll<HTMLElement>("[style]").forEach((element) => {
    if (hiddenStylePattern.test(element.getAttribute("style") ?? "")) {
      element.remove();
    }
  });
}

function sanitizeLinks(root: HTMLElement) {
  root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
    const href = link.getAttribute("href")?.trim() ?? "";
    const compactHref = href.replace(/[\u0000-\u0020]+/g, "");

    if (
      !href ||
      (explicitUrlSchemePattern.test(compactHref) &&
        !safeUrlSchemePattern.test(compactHref))
    ) {
      link.removeAttribute("href");
    }
  });
}

function removeComments(root: HTMLElement) {
  const showComment =
    root.ownerDocument.defaultView?.NodeFilter.SHOW_COMMENT ?? 128;
  const walker = root.ownerDocument.createTreeWalker(
    root,
    showComment,
  );
  const comments: Comment[] = [];

  while (walker.nextNode()) {
    comments.push(walker.currentNode as Comment);
  }

  comments.forEach((comment) => comment.remove());
}

function stripPresentationAttributes(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("*").forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const keepsCodeLanguage =
        element.nodeName === "CODE" &&
        attribute.name === "class" &&
        languageClassPattern.test(attribute.value);

      if (
        !keepsCodeLanguage &&
        (attribute.name === "class" ||
          attribute.name === "style" ||
          attribute.name.startsWith("data-") ||
          attribute.name.startsWith("on"))
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  });
}

function normalizeMarkdown(markdown: string) {
  return markdown
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function sanitizeClipboardHtml(html: string) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const { body } = parsed;

  replaceImagesWithAltText(body);
  removeUnsafeAndDecorativeElements(body);
  sanitizeLinks(body);
  removeComments(body);
  stripPresentationAttributes(body);

  return body;
}

export async function convertClipboardHtmlToMarkdown(html: string) {
  const root = sanitizeClipboardHtml(html);
  const [{ default: TurndownService }, { gfm }] = await Promise.all([
    import("turndown"),
    import("@joplin/turndown-plugin-gfm"),
  ]);
  const turndown = new TurndownService({
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    headingStyle: "atx",
    strongDelimiter: "**",
  });

  turndown.use(gfm);
  turndown.addRule("fencedCodeLanguage", {
    filter: (node) =>
      node.nodeName === "PRE" &&
      node.firstElementChild?.nodeName === "CODE" &&
      languageClassPattern.test(
        node.firstElementChild.getAttribute("class") ?? "",
      ),
    replacement: (_content, node) => {
      const code = node.firstElementChild;
      const language = (
        code?.getAttribute("class") ?? ""
      ).match(languageClassPattern)?.[1];
      const value = (code?.textContent ?? "").replace(/\n$/, "");

      return `\n\n\`\`\`${language ?? ""}\n${value}\n\`\`\`\n\n`;
    },
  });

  return normalizeMarkdown(turndown.turndown(root));
}

export function insertClipboardText(args: {
  currentValue: string;
  end: number;
  insertedValue: string;
  start: number;
}) {
  const { currentValue, end, insertedValue, start } = args;

  return `${currentValue.slice(0, start)}${insertedValue}${currentValue.slice(end)}`;
}
