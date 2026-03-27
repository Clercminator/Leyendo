export type DocumentSourceKind = "pdf" | "docx" | "markdown" | "plain-text";

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
  index: number;
  kind: "heading" | "paragraph" | "list-item";
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
