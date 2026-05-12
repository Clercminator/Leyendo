import { manualGuidesApps } from "./guides-manual-apps";
import { manualGuidesFoundations } from "./guides-manual-foundations";
import { manualGuidesLocales } from "./guides-manual-locales";
import { manualGuidesWorkflows } from "./guides-manual-workflows";
import type { Guide } from "../guides";

export const manualGuides: readonly Guide[] = [
  ...manualGuidesFoundations,
  ...manualGuidesWorkflows,
  ...manualGuidesApps,
  ...manualGuidesLocales,
];
