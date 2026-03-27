import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { visit } from "unist-util-visit";

interface MarkdownBlock {
  kind: "heading" | "paragraph" | "list-item";
  text: string;
}

interface MarkdownNode {
  type?: string;
  value?: string;
  alt?: string | null;
  children?: MarkdownNode[];
}

function extractNodeText(node: MarkdownNode | undefined): string {
  if (!node) {
    return "";
  }

  if (typeof node.value === "string") {
    return node.value;
  }

  if (typeof node.alt === "string") {
    return node.alt;
  }

  if (!Array.isArray(node.children)) {
    return "";
  }

  return node.children.map((child) => extractNodeText(child)).join("");
}

export function extractMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);
  const blocks: MarkdownBlock[] = [];

  visit(tree, (node, _index, parent) => {
    const markdownNode = node as MarkdownNode;

    if (markdownNode.type === "heading") {
      const text = extractNodeText(markdownNode).replace(/\s+/g, " ").trim();
      if (text) {
        blocks.push({ kind: "heading", text });
      }
    }

    if (markdownNode.type === "paragraph" && parent?.type !== "listItem") {
      const text = extractNodeText(markdownNode).replace(/\s+/g, " ").trim();
      if (text) {
        blocks.push({ kind: "paragraph", text });
      }
    }

    if (markdownNode.type === "listItem") {
      const text = extractNodeText(markdownNode).replace(/\s+/g, " ").trim();
      if (text) {
        blocks.push({ kind: "list-item", text });
      }
    }
  });

  return blocks;
}
