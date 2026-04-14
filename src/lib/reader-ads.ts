import type { PlanTier } from "@/lib/plans";

export type ReaderAdProviderId = "ima";
export type ReaderAdDemandMode = "test" | "live";
export type ReaderAdConsentState = "unknown" | "granted" | "denied";
export type ReaderAdConsentRegion = "uk" | "eu" | "other" | "unknown";

export interface ReaderAdsConfig {
  adTagUrl: string;
  bounceWindowMs: number;
  breakIntervalMs: number;
  demandMode: ReaderAdDemandMode;
  enabled: boolean;
  inactivityGraceMs: number;
  maxBreaksPer24Hours: number;
  provider: ReaderAdProviderId;
  requireEuropeanConsentForLiveDemand: boolean;
  upgradeHref: string;
}

export interface ReaderAdMetricContext {
  breakCount: number;
  consentRegion: ReaderAdConsentRegion;
  demandMode: ReaderAdDemandMode;
  planTier: PlanTier;
  provider: ReaderAdProviderId;
  readerMode: string;
}

export interface ReaderAdStorageSnapshot {
  breakTimestamps: number[];
  consentState?: ReaderAdConsentState;
  lastBreakShownAt?: number;
  readingMsSinceBreak?: number;
}

const DEFAULT_TEST_VAST_TAG_URL =
  "https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=";
const DEFAULT_BREAK_INTERVAL_MINUTES = 10;
const DEFAULT_BOUNCE_WINDOW_SECONDS = 45;
const DEFAULT_INACTIVITY_GRACE_SECONDS = 120;
const DEFAULT_MAX_BREAKS_PER_24_HOURS = 3;

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parseDemandMode(value: string | undefined): ReaderAdDemandMode {
  return value === "live" ? "live" : "test";
}

function parseProvider(value: string | undefined): ReaderAdProviderId {
  return value === "ima" ? "ima" : "ima";
}

function parseBooleanFlag(value: string | undefined, fallback: boolean) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}

export function getReaderAdsConfig(): ReaderAdsConfig {
  return {
    adTagUrl:
      process.env.NEXT_PUBLIC_READER_ADS_IMA_TAG_URL ??
      DEFAULT_TEST_VAST_TAG_URL,
    bounceWindowMs:
      parsePositiveInt(
        process.env.NEXT_PUBLIC_READER_ADS_BOUNCE_WINDOW_SECONDS,
        DEFAULT_BOUNCE_WINDOW_SECONDS,
      ) * 1000,
    breakIntervalMs:
      parsePositiveInt(
        process.env.NEXT_PUBLIC_READER_ADS_BREAK_INTERVAL_MINUTES,
        DEFAULT_BREAK_INTERVAL_MINUTES,
      ) *
      60 *
      1000,
    demandMode: parseDemandMode(process.env.NEXT_PUBLIC_READER_ADS_DEMAND_MODE),
    enabled: parseBooleanFlag(
      process.env.NEXT_PUBLIC_READER_ADS_ENABLED,
      false,
    ),
    inactivityGraceMs:
      parsePositiveInt(
        process.env.NEXT_PUBLIC_READER_ADS_INACTIVITY_GRACE_SECONDS,
        DEFAULT_INACTIVITY_GRACE_SECONDS,
      ) * 1000,
    maxBreaksPer24Hours: parsePositiveInt(
      process.env.NEXT_PUBLIC_READER_ADS_MAX_BREAKS_PER_DAY,
      DEFAULT_MAX_BREAKS_PER_24_HOURS,
    ),
    provider: parseProvider(process.env.NEXT_PUBLIC_READER_ADS_PROVIDER),
    requireEuropeanConsentForLiveDemand: parseBooleanFlag(
      process.env.NEXT_PUBLIC_READER_ADS_REQUIRE_EU_UK_CONSENT,
      true,
    ),
    upgradeHref:
      process.env.NEXT_PUBLIC_READER_ADS_UPGRADE_HREF ??
      "/pricing?source=reader-ad-break",
  };
}

export function getReaderAdsStorageKey(ownerKey: string) {
  return `leyendo:reader-ads:${ownerKey}`;
}

export function pruneBreakTimestamps(
  breakTimestamps: number[],
  now: number,
  windowMs = 24 * 60 * 60 * 1000,
) {
  return breakTimestamps.filter((timestamp) => now - timestamp < windowMs);
}

export function getRemainingReaderAdBreaks(args: {
  breakTimestamps: number[];
  maxBreaksPer24Hours: number;
  now: number;
}) {
  const recentBreaks = pruneBreakTimestamps(args.breakTimestamps, args.now);
  return Math.max(0, args.maxBreaksPer24Hours - recentBreaks.length);
}

export function canScheduleReaderAdBreak(args: {
  breakTimestamps: number[];
  maxBreaksPer24Hours: number;
  now: number;
}) {
  return getRemainingReaderAdBreaks(args) > 0;
}

export function resolveReaderAdConsentRegion(timeZone?: string) {
  if (!timeZone) {
    return "unknown" satisfies ReaderAdConsentRegion;
  }

  if (timeZone === "Europe/London") {
    return "uk" satisfies ReaderAdConsentRegion;
  }

  if (timeZone.startsWith("Europe/")) {
    return "eu" satisfies ReaderAdConsentRegion;
  }

  return "other" satisfies ReaderAdConsentRegion;
}

export function requiresReaderAdConsent(args: {
  demandMode: ReaderAdDemandMode;
  region: ReaderAdConsentRegion;
  requireEuropeanConsentForLiveDemand: boolean;
}) {
  if (!args.requireEuropeanConsentForLiveDemand) {
    return false;
  }

  if (args.demandMode !== "live") {
    return false;
  }

  return args.region === "eu" || args.region === "uk";
}

export function shouldEnableReaderAdsForPlan(planTier: PlanTier) {
  return planTier === "basic";
}
