"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { preloadImaSdk } from "@/components/reader/ima-ad-player";
import { trackReaderAdMetric } from "@/lib/reader-ad-analytics";
import {
  canScheduleReaderAdBreak,
  getReaderAdsConfig,
  getReaderAdsStorageKey,
  getRemainingReaderAdBreaks,
  pruneBreakTimestamps,
  requiresReaderAdConsent,
  resolveReaderAdConsentRegion,
  shouldEnableReaderAdsForPlan,
  type ReaderAdConsentRegion,
  type ReaderAdConsentState,
  type ReaderAdStorageSnapshot,
} from "@/lib/reader-ads";
import type { PlanTier } from "@/lib/plans";

type ReaderAdBreakPhase = "idle" | "prompt" | "consent" | "loading" | "playing";

interface UseReaderAdBreaksOptions {
  documentId?: string;
  isPlaying: boolean;
  ownerKey: string;
  planTier: PlanTier;
  readerMode: string;
  readerReady: boolean;
  setPlaying: (nextValue: boolean) => void;
}

function readStoredSnapshot(
  storageKey: string,
): ReaderAdStorageSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as ReaderAdStorageSnapshot;
  } catch {
    return null;
  }
}

function persistSnapshot(
  storageKey: string,
  snapshot: ReaderAdStorageSnapshot,
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
  } catch {
    // Best-effort persistence only.
  }
}

export function useReaderAdBreaks({
  documentId,
  isPlaying,
  ownerKey,
  planTier,
  readerMode,
  readerReady,
  setPlaying,
}: UseReaderAdBreaksOptions) {
  const config = useMemo(() => getReaderAdsConfig(), []);
  const storageKey = useMemo(
    () => getReaderAdsStorageKey(ownerKey),
    [ownerKey],
  );
  const shouldMonetize =
    config.enabled &&
    Boolean(documentId) &&
    readerReady &&
    shouldEnableReaderAdsForPlan(planTier);
  const consentRegion = useMemo<ReaderAdConsentRegion>(() => {
    if (typeof window === "undefined") {
      return "unknown" as const;
    }

    return resolveReaderAdConsentRegion(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
  }, []);
  const [phase, setPhase] = useState<ReaderAdBreakPhase>("idle");
  const [consentState, setConsentState] =
    useState<ReaderAdConsentState>("unknown");
  const [remainingMs, setRemainingMs] = useState(config.breakIntervalMs);
  const [breakCount, setBreakCount] = useState(0);
  const accumulatedReadingMsRef = useRef(0);
  const breakTimestampsRef = useRef<number[]>([]);
  const lastActivityAtRef = useRef(Date.now());
  const lastTickAtRef = useRef(Date.now());
  const lastBreakShownAtRef = useRef<number | undefined>(undefined);
  const bounceTrackedRef = useRef(false);
  const mountedRef = useRef(false);

  const metricContext = useMemo(
    () => ({
      breakCount,
      consentRegion,
      demandMode: config.demandMode,
      planTier,
      provider: config.provider,
      readerMode,
    }),
    [
      breakCount,
      config.demandMode,
      config.provider,
      consentRegion,
      planTier,
      readerMode,
    ],
  );

  const persistCurrentState = useCallback(() => {
    persistSnapshot(storageKey, {
      breakTimestamps: breakTimestampsRef.current,
      consentState,
      lastBreakShownAt: lastBreakShownAtRef.current,
      readingMsSinceBreak: accumulatedReadingMsRef.current,
    });
  }, [consentState, storageKey]);

  const unlockReader = useCallback(() => {
    setPhase("idle");
    bounceTrackedRef.current = false;
    lastTickAtRef.current = Date.now();
    setRemainingMs(config.breakIntervalMs);
  }, [config.breakIntervalMs]);

  const openBreakPrompt = useCallback(() => {
    const now = Date.now();
    const nextBreakTimestamps = pruneBreakTimestamps(
      [...breakTimestampsRef.current, now],
      now,
    );

    breakTimestampsRef.current = nextBreakTimestamps;
    accumulatedReadingMsRef.current = 0;
    lastBreakShownAtRef.current = now;
    bounceTrackedRef.current = false;
    setBreakCount(nextBreakTimestamps.length);
    startTransition(() => {
      setPlaying(false);
      setPhase("prompt");
      setRemainingMs(config.breakIntervalMs);
    });
    persistSnapshot(storageKey, {
      breakTimestamps: nextBreakTimestamps,
      consentState,
      lastBreakShownAt: now,
      readingMsSinceBreak: 0,
    });
    trackReaderAdMetric("reader_ad_break_shown", {
      ...metricContext,
      breakCount: nextBreakTimestamps.length,
    });
  }, [
    config.breakIntervalMs,
    consentState,
    metricContext,
    setPlaying,
    storageKey,
  ]);

  useEffect(() => {
    if (!shouldMonetize) {
      setPhase("idle");
      setRemainingMs(config.breakIntervalMs);
      return;
    }

    const snapshot = readStoredSnapshot(storageKey);
    const now = Date.now();
    const nextBreakTimestamps = pruneBreakTimestamps(
      snapshot?.breakTimestamps ?? [],
      now,
    );

    breakTimestampsRef.current = nextBreakTimestamps;
    accumulatedReadingMsRef.current = Math.max(
      0,
      snapshot?.readingMsSinceBreak ?? 0,
    );
    lastBreakShownAtRef.current = snapshot?.lastBreakShownAt;
    lastActivityAtRef.current = now;
    lastTickAtRef.current = now;
    setConsentState(snapshot?.consentState ?? "unknown");
    setBreakCount(nextBreakTimestamps.length);
    setRemainingMs(
      Math.max(0, config.breakIntervalMs - accumulatedReadingMsRef.current),
    );
    mountedRef.current = true;

    void preloadImaSdk().catch(() => {
      // Keep preload non-blocking.
    });
  }, [config.breakIntervalMs, shouldMonetize, storageKey]);

  useEffect(() => {
    if (!shouldMonetize) {
      return;
    }

    const handleActivity = () => {
      lastActivityAtRef.current = Date.now();
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "keydown",
      "pointerdown",
      "scroll",
      "touchstart",
      "wheel",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, {
        passive: true,
      });
    });

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
    };
  }, [shouldMonetize]);

  useEffect(() => {
    if (!shouldMonetize) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (phase !== "idle") {
        return;
      }

      const now = Date.now();
      const delta = now - lastTickAtRef.current;
      lastTickAtRef.current = now;

      if (document.visibilityState !== "visible") {
        persistCurrentState();
        return;
      }

      const isRecentlyActive =
        now - lastActivityAtRef.current <= config.inactivityGraceMs;
      const isEngaged = isPlaying || isRecentlyActive;

      if (!isEngaged) {
        persistCurrentState();
        return;
      }

      accumulatedReadingMsRef.current += delta;

      const remainingBreaks = getRemainingReaderAdBreaks({
        breakTimestamps: breakTimestampsRef.current,
        maxBreaksPer24Hours: config.maxBreaksPer24Hours,
        now,
      });

      if (remainingBreaks <= 0) {
        setRemainingMs(config.breakIntervalMs);
        persistCurrentState();
        return;
      }

      const nextRemainingMs = Math.max(
        0,
        config.breakIntervalMs - accumulatedReadingMsRef.current,
      );
      setRemainingMs(nextRemainingMs);

      if (
        accumulatedReadingMsRef.current >= config.breakIntervalMs &&
        canScheduleReaderAdBreak({
          breakTimestamps: breakTimestampsRef.current,
          maxBreaksPer24Hours: config.maxBreaksPer24Hours,
          now,
        })
      ) {
        openBreakPrompt();
        return;
      }

      if (accumulatedReadingMsRef.current % 15_000 < delta) {
        persistCurrentState();
      }
    }, 1_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    config.breakIntervalMs,
    config.inactivityGraceMs,
    config.maxBreaksPer24Hours,
    isPlaying,
    openBreakPrompt,
    persistCurrentState,
    phase,
    shouldMonetize,
  ]);

  useEffect(() => {
    if (!shouldMonetize) {
      return;
    }

    const trackBounceIfNeeded = () => {
      if (bounceTrackedRef.current || phase === "idle") {
        return;
      }

      bounceTrackedRef.current = true;
      trackReaderAdMetric("reader_ad_bounced_after_break", metricContext, {
        phase,
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        trackBounceIfNeeded();
        persistCurrentState();
      }
    };

    const handlePageHide = () => {
      trackBounceIfNeeded();
      persistCurrentState();
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [metricContext, persistCurrentState, phase, shouldMonetize]);

  useEffect(() => {
    if (!mountedRef.current) {
      return;
    }

    persistCurrentState();
  }, [consentState, persistCurrentState]);

  useEffect(() => {
    if (!shouldMonetize) {
      unlockReader();
    }
  }, [shouldMonetize, unlockReader]);

  const consentRequired = requiresReaderAdConsent({
    demandMode: config.demandMode,
    region: consentRegion,
    requireEuropeanConsentForLiveDemand:
      config.requireEuropeanConsentForLiveDemand,
  });

  const beginAdBreak = useCallback(() => {
    if (consentRequired && consentState !== "granted") {
      setPhase("consent");
      return;
    }

    setPhase("loading");
  }, [consentRequired, consentState]);

  const grantConsent = useCallback(() => {
    setConsentState("granted");
    setPhase("loading");
  }, []);

  const denyConsent = useCallback(() => {
    setConsentState("denied");
    accumulatedReadingMsRef.current = 0;
    trackReaderAdMetric("reader_ad_break_failed", metricContext, {
      reason: "consent_denied",
    });
    unlockReader();
    persistCurrentState();
  }, [metricContext, persistCurrentState, unlockReader]);

  const handleAdStarted = useCallback(() => {
    setPhase("playing");
    trackReaderAdMetric("reader_ad_break_started", metricContext);
  }, [metricContext]);

  const handleAdCompleted = useCallback(() => {
    trackReaderAdMetric("reader_ad_break_completed", metricContext);
    unlockReader();
    persistCurrentState();
  }, [metricContext, persistCurrentState, unlockReader]);

  const handleAdFailed = useCallback(
    (reason?: string) => {
      trackReaderAdMetric("reader_ad_break_failed", metricContext, {
        reason: reason ?? "unknown",
      });
      accumulatedReadingMsRef.current = 0;
      unlockReader();
      persistCurrentState();
    },
    [metricContext, persistCurrentState, unlockReader],
  );

  const handleUpgradeClick = useCallback(() => {
    trackReaderAdMetric("reader_ad_upgrade_after_break", metricContext, {
      consent_required: consentRequired,
    });
  }, [consentRequired, metricContext]);

  return {
    adTagUrl: config.adTagUrl,
    beginAdBreak,
    consentRegion,
    consentState,
    demandMode: config.demandMode,
    denyConsent,
    grantConsent,
    handleAdCompleted,
    handleAdFailed,
    handleAdStarted,
    isOpen: phase !== "idle",
    phase,
    provider: config.provider,
    remainingMs,
    shouldRender: shouldMonetize,
    trackUpgradeClick: handleUpgradeClick,
    upgradeHref: config.upgradeHref,
  };
}
