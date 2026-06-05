import { memo } from "react";

import { ClassicReaderView } from "@/components/reader/classic-reader-view";
import { FocusWordView } from "@/components/reader/focus-word-view";
import { GuidedLineView } from "@/components/reader/guided-line-view";
import { PhraseChunkView } from "@/components/reader/phrase-chunk-view";
import type { Chunk, DocumentModel } from "@/types/document";
import type { ReaderMode } from "@/types/reader";

interface ReaderWorkspaceModeViewProps {
  activeChunk?: Chunk;
  activePayload?: DocumentModel;
  canvasMode: ReaderMode;
  focusWindow: number;
  reduceMotion: boolean;
  runtimeChunks: Chunk[];
  simplifyClassicMarkdownPreview: boolean;
  visibleSourcePageIndex?: number;
  onJumpToToken: (tokenIndex: number) => void;
}

export const ReaderWorkspaceModeView = memo(function ReaderWorkspaceModeView({
  activeChunk,
  activePayload,
  canvasMode,
  focusWindow,
  reduceMotion,
  runtimeChunks,
  simplifyClassicMarkdownPreview,
  onJumpToToken,
}: ReaderWorkspaceModeViewProps) {
  if (!activePayload || !activeChunk) {
    return null;
  }

  switch (canvasMode) {
    case "classic-reader":
      return (
        <ClassicReaderView
          document={activePayload}
          chunk={activeChunk}
          onJumpToToken={onJumpToToken}
          reduceMotion={reduceMotion}
          simplifyMarkdownPreview={simplifyClassicMarkdownPreview}
        />
      );
    case "phrase-chunk":
      return (
        <PhraseChunkView
          document={activePayload}
          chunk={activeChunk}
          chunks={runtimeChunks}
        />
      );
    case "guided-line":
      return (
        <GuidedLineView
          document={activePayload}
          chunk={activeChunk}
          chunks={runtimeChunks}
          focusWindow={focusWindow}
          onJumpToToken={onJumpToToken}
        />
      );
    default:
      return <FocusWordView document={activePayload} chunk={activeChunk} />;
  }
});
