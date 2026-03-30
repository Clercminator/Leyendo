export type DocumentSourceKind =
  | "pdf"
  | "docx"
  | "rtf"
  | "markdown"
  | "plain-text";

export type BlockKind = "heading" | "paragraph" | "list-item";

export type BlockAlignment = "left" | "center";

export interface DocumentBlockInput {
  kind: BlockKind;
  text: string;
  alignment?: BlockAlignment;
  marker?: string;
  sourcePageIndex?: number;
}

export interface SourcePage {
  index: number;
  label: string;
  sourceStartOffset: number;
  sourceEndOffset: number;
}

export interface Token {
  index: number;
  value: string;
  normalizedValue: string;
  paragraphIndex: number;
  sentenceIndex: number;
  sourcePageIndex?: number;
  absoluteOffset: number;
}

export interface Sentence {
  index: number;
  paragraphIndex: number;
  sourcePageIndex?: number;
  text: string;
  tokenStart: number;
  tokenEnd: number;
}

export interface Block {
  alignment?: BlockAlignment;
  index: number;
  kind: BlockKind;
  marker?: string;
  text: string;
  sentenceStart: number;
  sentenceEnd: number;
  tokenStart: number;
  tokenEnd: number;
  sourcePageIndex?: number;
}

export interface Chunk {
  index: number;
  text: string;
  tokenIndexes: number[];
  anchorTokenIndex: number;
  paragraphIndex: number;
  sentenceIndex: number;
  sectionIndex: number;
  sourcePageIndex?: number;
  absoluteReadingPosition: number;
}

export interface Section {
  index: number;
  title: string;
  blockIndexes: number[];
  chunkStart: number;
  chunkEnd: number;
  sourcePageIndex?: number;
}

export interface DocumentModel {
  id: string;
  title: string;
  sourceKind: DocumentSourceKind;
  createdAt: string;
  updatedAt: string;
  text: string;
  excerpt: string;
  pages: SourcePage[];
  blocks: Block[];
  sentences: Sentence[];
  tokens: Token[];
  chunks: Chunk[];
  sections: Section[];
}

export interface DocumentRecord {
  id: string;
  title: string;
  sourceKind: DocumentSourceKind;
  excerpt: string;
  createdAt: string;
  updatedAt: string;
  totalChunks: number;
  totalSections: number;
  payload?: DocumentModel;
}
