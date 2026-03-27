export function createLargeDocumentText(
  paragraphCount = 180,
  wordsPerParagraph = 28,
) {
  return Array.from({ length: paragraphCount }, (_, paragraphIndex) => {
    const words = Array.from({ length: wordsPerParagraph }, (_, wordIndex) => {
      return `term-${paragraphIndex}-${wordIndex}`;
    }).join(" ");

    return `Paragraph ${paragraphIndex + 1}. ${words}.`;
  }).join("\n\n");
}
