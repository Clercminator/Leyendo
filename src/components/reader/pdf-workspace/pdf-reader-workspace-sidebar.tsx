import type { ComponentProps } from "react";

import { ReaderSidebar } from "@/components/reader/reader-sidebar";

type PdfReaderWorkspaceSidebarProps = ComponentProps<typeof ReaderSidebar> & {
  onClose?: () => void;
};

export function PdfReaderWorkspaceSidebar({
  onClose,
  onJumpToBookmark,
  onJumpToHighlight,
  onJumpToOutlineItem,
  onJumpToThumbnail,
  onSaveBookmark,
  onSaveHighlight,
  ...sidebarProps
}: PdfReaderWorkspaceSidebarProps) {
  return (
    <ReaderSidebar
      {...sidebarProps}
      onJumpToBookmark={(bookmark) => {
        onJumpToBookmark(bookmark);
        onClose?.();
      }}
      onJumpToHighlight={(highlight) => {
        onJumpToHighlight(highlight);
        onClose?.();
      }}
      onJumpToOutlineItem={
        onJumpToOutlineItem
          ? (outlineItem) => {
              onJumpToOutlineItem(outlineItem);
              onClose?.();
            }
          : undefined
      }
      onJumpToThumbnail={
        onJumpToThumbnail
          ? (pageIndex) => {
              onJumpToThumbnail(pageIndex);
              onClose?.();
            }
          : undefined
      }
      onSaveBookmark={
        onSaveBookmark
          ? () => {
              onSaveBookmark();
              onClose?.();
            }
          : undefined
      }
      onSaveHighlight={
        onSaveHighlight
          ? () => {
              onSaveHighlight();
              onClose?.();
            }
          : undefined
      }
    />
  );
}