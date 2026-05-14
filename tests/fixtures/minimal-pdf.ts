function escapePdfText(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

type MinimalPdfPage = string | string[];

function createPdfPageContent(page: MinimalPdfPage) {
  const lines = Array.isArray(page) ? page : [page];
  const pageLines = lines.length > 0 ? lines : ["Hello PDF from Leyendo"];
  const contentStream = ["BT", "/F1 18 Tf", "72 736 Td"];

  pageLines.forEach((line, index) => {
    if (index > 0) {
      contentStream.push("0 -26 Td");
    }

    contentStream.push(`(${escapePdfText(line)}) Tj`);
  });

  contentStream.push("ET", "");

  return contentStream.join("\n");
}

export function createMinimalPdfBuffer(pages: MinimalPdfPage[]) {
  const pageTexts = pages.length > 0 ? pages : ["Hello PDF from Leyendo"];
  const pageObjectIds = pageTexts.map((_, index) => 4 + index * 2);
  const contentObjectIds = pageTexts.map((_, index) => 5 + index * 2);
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjectIds.map((pageObjectId) => `${pageObjectId} 0 R`).join(" ")}] /Count ${pageTexts.length} >>\nendobj\n`,
    "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];

  pageTexts.forEach((pageText, index) => {
    const contentStream = createPdfPageContent(pageText);

    objects.push(
      `${pageObjectIds[index]} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectIds[index]} 0 R >>\nendobj\n`,
    );
    objects.push(
      `${contentObjectIds[index]} 0 obj\n<< /Length ${Buffer.byteLength(contentStream, "ascii")} >>\nstream\n${contentStream}endstream\nendobj\n`,
    );
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((objectBody) => {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += objectBody;
  });

  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "ascii");
}
