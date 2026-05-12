const rtfIgnoredDestinations = new Set([
  "annotation",
  "author",
  "colortbl",
  "comment",
  "datastore",
  "field",
  "fldinst",
  "fonttbl",
  "footer",
  "footerf",
  "footerl",
  "footerr",
  "footnote",
  "header",
  "headerf",
  "headerl",
  "headerr",
  "info",
  "keywords",
  "object",
  "operator",
  "pict",
  "private",
  "stylesheet",
  "subject",
  "tc",
  "title",
  "xe",
  "xmlattrname",
  "xmlattrvalue",
  "xmlclose",
  "xmlname",
  "xmlnstbl",
  "xmlopen",
]);

let rtfTextDecoder: TextDecoder | null = null;

function normalizeExtractedText(text: string) {
  return text.replace(/\r\n/g, "\n").trim();
}

function decodeRtfByte(value: number) {
  rtfTextDecoder ??= new TextDecoder("windows-1252");
  return rtfTextDecoder.decode(Uint8Array.of(value));
}

function decodeRtfSource(arrayBuffer: ArrayBuffer) {
  rtfTextDecoder ??= new TextDecoder("windows-1252");
  return rtfTextDecoder.decode(new Uint8Array(arrayBuffer));
}

function appendRtfText(output: string[], value: string, ignorable: boolean) {
  if (!ignorable && value) {
    output.push(value);
  }
}

function normalizeRtfText(text: string) {
  return normalizeExtractedText(
    text
      .replace(/\u0000/g, "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n"),
  );
}

export async function extractRtfTextFromArrayBuffer(arrayBuffer: ArrayBuffer) {
  const source = decodeRtfSource(arrayBuffer);
  if (!source.trimStart().startsWith("{\\rtf")) {
    throw new Error("We couldn't read that RTF file.");
  }

  const output: string[] = [];
  const stateStack = [{ ignorable: false, ucSkip: 1 }];
  let pendingAnsiSkip = 0;
  let pendingBinaryBytes = 0;

  for (let index = 0; index < source.length; index += 1) {
    if (pendingBinaryBytes > 0) {
      pendingBinaryBytes -= 1;
      continue;
    }

    const state = stateStack[stateStack.length - 1] ?? {
      ignorable: false,
      ucSkip: 1,
    };
    const character = source[index];

    if (character === "{") {
      stateStack.push({ ...state });
      continue;
    }

    if (character === "}") {
      if (stateStack.length > 1) {
        stateStack.pop();
      }
      pendingAnsiSkip = 0;
      continue;
    }

    if (character !== "\\") {
      if (pendingAnsiSkip > 0) {
        pendingAnsiSkip -= 1;
        continue;
      }

      appendRtfText(output, character, state.ignorable);
      continue;
    }

    index += 1;
    if (index >= source.length) {
      break;
    }

    const next = source[index];

    if (next === "\r" || next === "\n") {
      continue;
    }

    if (next === "\\" || next === "{" || next === "}") {
      if (pendingAnsiSkip > 0) {
        pendingAnsiSkip -= 1;
      } else {
        appendRtfText(output, next, state.ignorable);
      }
      continue;
    }

    if (next === "'") {
      const hex = source.slice(index + 1, index + 3);
      if (/^[0-9a-fA-F]{2}$/u.test(hex)) {
        if (pendingAnsiSkip > 0) {
          pendingAnsiSkip -= 1;
        } else {
          appendRtfText(
            output,
            decodeRtfByte(Number.parseInt(hex, 16)),
            state.ignorable,
          );
        }
        index += 2;
      }
      continue;
    }

    if (next === "~") {
      if (pendingAnsiSkip > 0) {
        pendingAnsiSkip -= 1;
      } else {
        appendRtfText(output, " ", state.ignorable);
      }
      continue;
    }

    if (next === "_") {
      if (pendingAnsiSkip > 0) {
        pendingAnsiSkip -= 1;
      } else {
        appendRtfText(output, "-", state.ignorable);
      }
      continue;
    }

    if (next === "-") {
      if (pendingAnsiSkip > 0) {
        pendingAnsiSkip -= 1;
      }
      continue;
    }

    if (next === "*") {
      state.ignorable = true;
      continue;
    }

    if (!/[A-Za-z]/u.test(next)) {
      continue;
    }

    let controlWord = next;
    while (index + 1 < source.length && /[A-Za-z]/u.test(source[index + 1])) {
      controlWord += source[index + 1];
      index += 1;
    }

    let sign = 1;
    if (source[index + 1] === "-") {
      sign = -1;
      index += 1;
    }

    let digits = "";
    while (index + 1 < source.length && /\d/u.test(source[index + 1])) {
      digits += source[index + 1];
      index += 1;
    }

    if (source[index + 1] === " ") {
      index += 1;
    }

    const parameter = digits ? sign * Number.parseInt(digits, 10) : null;
    const currentState = stateStack[stateStack.length - 1] ?? state;

    if (rtfIgnoredDestinations.has(controlWord)) {
      currentState.ignorable = true;
      continue;
    }

    switch (controlWord) {
      case "bin":
        pendingBinaryBytes = Math.max(parameter ?? 0, 0);
        break;
      case "cell":
      case "line":
      case "par":
      case "row":
        appendRtfText(output, "\n", currentState.ignorable);
        pendingAnsiSkip = 0;
        break;
      case "tab":
        appendRtfText(output, "\t", currentState.ignorable);
        break;
      case "bullet":
        appendRtfText(output, "*", currentState.ignorable);
        break;
      case "emdash":
      case "endash":
        appendRtfText(output, "-", currentState.ignorable);
        break;
      case "lquote":
      case "rquote":
        appendRtfText(output, "'", currentState.ignorable);
        break;
      case "ldblquote":
      case "rdblquote":
        appendRtfText(output, '"', currentState.ignorable);
        break;
      case "uc":
        currentState.ucSkip = Math.max(parameter ?? currentState.ucSkip, 0);
        break;
      case "u": {
        if (!currentState.ignorable && parameter !== null) {
          const codePoint = parameter < 0 ? parameter + 65536 : parameter;
          appendRtfText(output, String.fromCodePoint(codePoint), false);
        }
        pendingAnsiSkip = currentState.ucSkip;
        break;
      }
      default:
        break;
    }
  }

  const rawText = normalizeRtfText(output.join(""));

  if (!rawText) {
    throw new Error("We couldn't extract readable text from that RTF file.");
  }

  return rawText;
}