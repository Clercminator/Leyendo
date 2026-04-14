"use client";

import { forwardRef } from "react";

import {
  ImaAdPlayer,
  type ReaderAdProviderHandle,
} from "@/components/reader/ima-ad-player";
import type { ReaderAdProviderId } from "@/lib/reader-ads";

interface ReaderAdProviderProps {
  active: boolean;
  adTagUrl: string;
  onCompleted: () => void;
  onFailed: (reason?: string) => void;
  onStarted: () => void;
  provider: ReaderAdProviderId;
}

export const ReaderAdProvider = forwardRef<
  ReaderAdProviderHandle,
  ReaderAdProviderProps
>(function ReaderAdProvider(
  { active, adTagUrl, onCompleted, onFailed, onStarted, provider },
  ref,
) {
  switch (provider) {
    case "ima":
      return (
        <ImaAdPlayer
          ref={ref}
          active={active}
          adTagUrl={adTagUrl}
          onCompleted={onCompleted}
          onFailed={onFailed}
          onStarted={onStarted}
        />
      );
    default:
      return null;
  }
});

export type { ReaderAdProviderHandle } from "@/components/reader/ima-ad-player";
