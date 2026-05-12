import mammoth from "mammoth/mammoth.browser";

function normalizeExtractedText(text: string) {
  return text.replace(/\r\n/g, "\n").trim();
}

export async function extractDocxTextFromArrayBuffer(arrayBuffer: ArrayBuffer) {
  const result = await mammoth.extractRawText({ arrayBuffer });
  const rawText = normalizeExtractedText(result.value);

  if (!rawText) {
    throw new Error("We couldn't extract readable text from that DOCX file.");
  }

  return rawText;
}