goal: Raise Lee to an honest 9.0-quality public alpha
version: 1.1
date_created: 2026-03-26
last_updated: 2026-03-26
owner: GitHub Copilot
status: Revised
tags: [upgrade, product, architecture, accessibility, performance, testing, documentation]

---

# 1. Revised Audit

This file was updated after a code audit because the previous version understated the current implementation and repeated a number of stale claims.

## Verified Current State

Lee is no longer just a scaffold. The following are already implemented and present in the current codebase:

- Landing flow with goal selection and document intake
- Upload and paste support for plain text, Markdown, DOCX, and PDFs with selectable text
- Worker-backed thresholds for heavier PDF extraction and document-model building
- A typed document model with blocks, sentences, tokens, chunks, and sections
- Four working reader modes:
  - Focus Word
  - Phrase Chunk
  - Guided Line
  - Classic Reader
- Reader playback timing and pacing controls
- Local persistence for sessions, preferences, bookmarks, and highlights via Dexie
- Deep linking back into bookmarks and highlights from the library
- Shell-level skip links and route structure for the core reading surfaces
- Unit tests, a component-hook test, and Playwright coverage for the main reading flow

## Claims Removed From The Old Plan

The earlier draft treated several completed pieces as missing. Those claims were stale and have been removed.

- Skip links are already present.
- Reader controller decomposition is already underway through dedicated hooks and split reader components.
- Large-document worker offloading already exists for heavy extraction and model building.
- Goal selection already uses grouped radio semantics.
- Reader playback timing already exists.
- Bookmarks, highlights, and recent-session hydration already exist.
- Component test coverage is not broad yet, but it is not zero.

# 2. Current Gaps After This Audit

The highest-value remaining gaps are now different from the earlier draft.

## Data Safety

- There is still no export or import flow for browser-stored data.
- Local-first storage is useful, but it is fragile without a backup path.

## Storage Failure Handling

- IndexedDB reads and writes are still mostly optimistic.
- The app needs clearer recovery paths for quota failures, unsupported environments, and storage corruption.

## Library Management

- This pass adds clearing reading progress and removing local documents.
- The next step is to improve metadata, timestamps, and local cleanup ergonomics further.

## Testing Depth

- Core logic coverage is solid.
- UI regression coverage is still thinner than it should be for storage failures, destructive actions, and accessibility-specific flows.

## Documentation Accuracy

- The README had drifted badly from the actual implementation.
- Product and technical docs need to stay synchronized with the shipped code or they become a source of false planning.

# 3. What This Iteration Delivers

This iteration is focused on accuracy and local library management.

- Rewrite the README so it reflects the current implementation instead of an earlier scaffold state
- Replace stale claims in this plan with a verified current-state audit
- Add repository support for clearing saved reading progress by document
- Add repository support for removing a document together with its local sessions, bookmarks, and highlights
- Expose those cleanup actions in the library UI

# 4. Updated Priority Plan

## Phase 1: Trust The Repo State

- Keep README, planning docs, and product framing aligned with real implementation
- Avoid speculative plan language when the code can be audited directly
- Treat stale documentation as a product-quality bug

## Phase 2: Strengthen Local-First Reliability

- Add export and import for local data
- Add storage-failure messaging and recovery states
- Add stronger cleanup coverage around destructive library actions

## Phase 3: Expand UI Regression Coverage

- Add component tests for the library, upload panel, and reader controls
- Add end-to-end coverage for destructive library actions and failure paths
- Extend accessibility and responsive validation beyond the current happy-path flow

# 5. Next Recommended Tasks

1. Add browser-data export and import so local-first storage is not a dead end.
2. Add explicit IndexedDB failure handling and user-facing recovery messages.
3. Add timestamps and richer metadata presentation in the library.
4. Add component and end-to-end tests for document removal and progress clearing.
5. Continue tightening documentation so planning files only state verified facts.

# 6. Summary

The biggest correction from this audit is conceptual: Lee is already a working local-first reading alpha, not a bare foundation. The most important unfinished work is no longer basic reader capability. It is operational quality around local data safety, error handling, testing depth, and documentation accuracy.

- Split the reader into controller hooks and presentational components.
- Move document/session/bookmark/highlight loading into a `use-reader-document` hook.
- Move playback timing and autoplay lifecycle into a `use-reader-playback` hook.
- Move persistence side effects into `use-reader-persistence` and annotation actions into `use-reader-annotations`.
- Keep UI panels stateless wherever possible.
- Normalize repository modules by concern: documents, sessions, annotations, preferences.
- Files likely to change:
  - [src/components/reader/reader-workspace.tsx](c:\Users\clerc\Documents\Lee Project\src\components\reader\reader-workspace.tsx)
  - [src/state/reader-store.ts](c:\Users\clerc\Documents\Lee Project\src\state\reader-store.ts)
  - [src/db/repositories.ts](c:\Users\clerc\Documents\Lee Project\src\db\repositories.ts)
  - [src/features/reader/engine/navigation.ts](c:\Users\clerc\Documents\Lee Project\src\features\reader\engine\navigation.ts)
  - new `src/components/reader/*` panel and hook files
- How success will be measured:
  - Reader orchestration code becomes smaller, testable, and independently evolvable.
  - Playback, persistence, and annotation logic can be tested without rendering the full page.

## Documentation / Product Clarity

- Current score: 6.9
- Target score: 9.0
- Specific gaps:
  - The README still describes an earlier scaffold state and explicitly says some implemented features do not exist.
  - The product story is under-articulated for current maturity.
  - There is no clear architecture overview, status section, or testing matrix.
- Concrete fixes:
  - Rewrite [README.md](c:\Users\clerc\Documents\Lee Project\README.md) around current capabilities and honest limitations.
  - Add sections for product loop, supported inputs, privacy stance, current routes, architecture, testing, and near-term roadmap.
  - Document current reader modes and local persistence behavior accurately.
  - Add a short contribution and validation section with `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm test:e2e`.
- Files likely to change:
  - [README.md](c:\Users\clerc\Documents\Lee Project\README.md)
- How success will be measured:
  - README matches the shipped experience.
  - A new engineer can understand product scope, current limitations, and validation commands without opening the code first.

# 3. Prioritized Roadmap

## Phase 1: Reach 8.6-8.8

- Goal: Eliminate the largest quality risks without changing the product direction.
- Why it matters: This phase raises confidence quickly by improving a11y, reliability, and reader maintainability before deeper performance work lands.
- Exact implementation areas:
  - Add shell-level landmarks, skip links, and consistent focus-visible styling.
  - Refactor the reader workspace into canvas, control bar, sidebar panels, and controller hooks without changing user-facing behavior.
  - Remove duplicated mode state from the store and throttle persistence side effects.
  - Improve reader route copy, loading states, error states, and library empty/loading polish.
  - Add component test scaffolding and the first keyboard-focused Playwright checks.
- Expected score lift by category:
  - UI / Visual Design: +0.1
  - UX / Product Flow: +0.3
  - Functionality / Reliability: +0.4
  - Accessibility: +0.8
  - Testing / Validation: +0.3
  - Architecture / Code Organization: +0.5
  - Documentation / Product Clarity: +0.4

## Phase 2: Cross 9.0

- Goal: Harden performance, deepen validation, and finish the public-alpha quality pass.
- Why it matters: Phase 1 makes the app cleaner; Phase 2 makes it resilient under real usage and honest scrutiny.
- Exact implementation areas:
  - Add worker-based heavy ingest and document-model build path behind size thresholds.
  - Precompute or memoize paragraph token maps and runtime chunk derivations.
  - Split playback-driven rendering from static sidebar rendering.
  - Add reduced-motion defaults tied to system preference and a full reader-specific announcement strategy.
  - Expand library functionality with document/session cleanup and clearer metadata.
  - Add responsive Playwright coverage and component tests for critical reader panels.
  - Rewrite README completely.
- Expected score lift by category:
  - Features: +0.6
  - Performance: +1.4
  - Accessibility: +0.7
  - Responsiveness: +0.7
  - Testing / Validation: +0.5
  - Documentation / Product Clarity: +1.3

## Phase 3: Beyond 9.0 readiness

- Goal: Add optional quality improvements that strengthen craft without changing core scope.
- Why it matters: These changes increase polish and confidence, but they are not prerequisites for a strong public alpha.
- Exact implementation areas:
  - Add library filtering and lightweight document management.
  - Add a reader shortcuts/help overlay and richer session HUD.
  - Introduce richer per-mode explanatory microcopy and coaching.
  - Add performance instrumentation utilities and long-document benchmark fixtures.
  - Consider a dedicated `docs/architecture.md` if the README becomes too dense.
- Expected score lift by category:
  - UI / Visual Design: +0.2
  - UX / Product Flow: +0.2
  - Features: +0.4
  - Performance: +0.2
  - Documentation / Product Clarity: +0.1

# 4. File-Level Recommendations

- [src/components/reader/reader-workspace.tsx](c:\Users\clerc\Documents\Lee Project\src\components\reader\reader-workspace.tsx)
  - Break into controller hooks plus presentational sections.
  - Remove persistence side effects from direct render adjacency.
  - Add semantic regions, live status messaging, and keyboard shortcut handling.
- [src/state/reader-store.ts](c:\Users\clerc\Documents\Lee Project\src\state\reader-store.ts)
  - Remove duplicated `mode` state.
  - Expose narrower actions aligned to user intents rather than low-level field updates.
- [src/db/repositories.ts](c:\Users\clerc\Documents\Lee Project\src\db\repositories.ts)
  - Split by concern or at least group by documents, sessions, preferences, and annotations.
  - Add transaction-based helpers, cleanup operations, and better batch loading.
- [src/db/app-db.ts](c:\Users\clerc\Documents\Lee Project\src\db\app-db.ts)
  - Review indexes for recent-item and cleanup flows.
  - Prepare for any needed schema additions to support library management or denormalized metadata.
- [src/features/ingest/build/document-model.ts](c:\Users\clerc\Documents\Lee Project\src\features\ingest\build\document-model.ts)
  - Add precomputed paragraph token maps or paragraph metadata used by reader modes.
  - Add budget-aware benchmarks for larger inputs.
- [src/features/ingest/extract/file-text.ts](c:\Users\clerc\Documents\Lee Project\src\features\ingest\extract\file-text.ts)
  - Add ingest thresholds, progress hooks, and worker offloading for large PDFs and DOCX files.
- [src/features/reader/engine/navigation.ts](c:\Users\clerc\Documents\Lee Project\src\features\reader\engine\navigation.ts)
  - Introduce cached runtime chunk derivation and token-anchor lookup helpers that avoid repeated linear work where possible.
- [src/components/reader/classic-reader-view.tsx](c:\Users\clerc\Documents\Lee Project\src\components\reader\classic-reader-view.tsx)
  - Stop recomputing paragraph token ranges in render.
  - Improve semantics for active text and reading context.
- [src/components/reader/guided-line-view.tsx](c:\Users\clerc\Documents\Lee Project\src\components\reader\guided-line-view.tsx)
  - Move token grouping logic out of render and make active line semantics explicit.
- [src/components/reader/focus-word-view.tsx](c:\Users\clerc\Documents\Lee Project\src\components\reader\focus-word-view.tsx)
  - Add assistive text and safer announcement behavior for rapid text presentation.
- [src/components/reader/phrase-chunk-view.tsx](c:\Users\clerc\Documents\Lee Project\src\components\reader\phrase-chunk-view.tsx)
  - Add more explicit semantics for previous/current/next chunk context.
- [src/components/upload/upload-panel.tsx](c:\Users\clerc\Documents\Lee Project\src\components\upload\upload-panel.tsx)
  - Convert intake mode picker into a proper semantic control group.
  - Add inline progress and accessible error announcements.
- [src/components/onboarding/goal-selector.tsx](c:\Users\clerc\Documents\Lee Project\src\components\onboarding\goal-selector.tsx)
  - Convert to a semantic radio group with clear selected descriptions.
  - Add persistence error handling and system-preference defaults where needed.
- [src/components/library/library-list.tsx](c:\Users\clerc\Documents\Lee Project\src\components\library\library-list.tsx)
  - Improve loading and empty semantics.
  - Add cleanup actions and clearer metadata labels.
- [src/components/layout/site-header.tsx](c:\Users\clerc\Documents\Lee Project\src\components\layout\site-header.tsx)
  - Add mobile navigation and improved active-route affordances.
- [src/components/layout/app-shell.tsx](c:\Users\clerc\Documents\Lee Project\src\components\layout\app-shell.tsx)
  - Add skip links, clearer landmark structure, and optional page-level utility slots.
- [src/app/reader/page.tsx](c:\Users\clerc\Documents\Lee Project\src\app\reader\page.tsx)
  - Update title and description to current product reality.
- [src/app/page.tsx](c:\Users\clerc\Documents\Lee Project\src\app\page.tsx)
  - Tighten product framing and make the first-run flow more sequential.
- [src/app/globals.css](c:\Users\clerc\Documents\Lee Project\src\app\globals.css)
  - Add focus-visible tokens, contrast-safe variants, and reduced-motion helpers.
- [README.md](c:\Users\clerc\Documents\Lee Project\README.md)
  - Rewrite current status, supported inputs, reader features, architecture, validation, and roadmap sections.

# 5. Accessibility Upgrade Spec

## Keyboard navigation

- Add a skip link to main content in [src/components/layout/app-shell.tsx](c:\Users\clerc\Documents\Lee Project\src\components\layout\app-shell.tsx).
- Add a second skip link for the reader route that jumps directly to the reader canvas.
- Ensure upload mode, goal selection, reader mode, theme selection, and presets behave as grouped controls with arrow-key support where appropriate.
- Add keyboard shortcuts for reader actions with non-conflicting bindings and visible documentation.
- Ensure all destructive actions are reachable and reversible without pointer interaction.

## Focus states and focus order

- Create a shared `:focus-visible` token system in [src/app/globals.css](c:\Users\clerc\Documents\Lee Project\src\app\globals.css) with high-contrast outlines and offsets that remain visible on dark glass surfaces.
- Structure focus order as: shell nav -> page heading -> intake/reader primary area -> secondary controls -> annotations -> supporting stats.
- On reader load, keep focus stable on the page heading or explicit status banner rather than forcing focus into the autoplaying canvas.
- After save actions, announce success but do not steal focus unless the user requested review of the saved item.

## Screen reader semantics

- Use explicit landmarks: `header`, `nav`, `main`, `aside`, and labeled `section` elements.
- Convert goal and mode selectors to `fieldset` plus `legend` or proper ARIA radio group semantics.
- Label the reader canvas as the active reading region and the sidebar as reader controls.
- Add a polite status region for non-noisy state changes such as bookmark saved, highlight saved, playback paused, and chunk size changed.

## Motion sensitivity and reduced-motion behavior

- Respect `prefers-reduced-motion` on first load and hydrate `reduceMotion` accordingly.
- When reduced motion is active, default autoplay off, minimize transition effects, and soften guided-line emphasis changes.
- Avoid decorative hover motion for controls when reduced motion is active.

## Color contrast

- Audit muted text on glass surfaces in [src/app/globals.css](c:\Users\clerc\Documents\Lee Project\src\app\globals.css), especially `--text-muted` against `bg-white/6` and `bg-white/8` surfaces.
- Strengthen contrast for secondary labels, helper text, and disabled-but-visible controls.
- Ensure selected states do not depend on subtle border changes alone.

## Labels, roles, and announcements

- Add explicit accessible names to icon-plus-text controls where the visible label is ambiguous.
- Make error messages use `role="alert"` or an equivalent assertive announcement only for true errors.
- Add polite announcements for save and navigation actions.
- Avoid over-announcing current chunk text during autoplay.

## Reader-specific concerns for rapid text presentation

- Do not stream active chunk content into an assertive live region during autoplay.
- Provide a calmer screen-reader mode where the current passage is available on demand and playback can be paused automatically on focus.
- Ensure each reading mode has a descriptive explanation of how it presents text and when to use it.
- For focus-word and phrase-chunk modes, expose the current sentence or paragraph context outside the rapid-display heading.

## Concrete Playwright or test strategy for accessibility regressions

- Add keyboard-only Playwright flows covering goal selection, upload, reader controls, save bookmark, save highlight, and library resume.
- Add assertions for visible focus movement after each keyboard action.
- Add component tests asserting grouped control semantics and accessible names.
- Add one Playwright run with reduced motion enabled and verify calm behavior defaults.
- Add route-level checks for skip links, heading presence, and landmark counts.

# 6. Performance Upgrade Spec

## Large document ingest strategy

- Define thresholds based on character count, token count, and page count.
- Keep main-thread ingest for small documents.
- For heavy pasted text, PDF, and DOCX files, offload extraction and model-building to a dedicated worker.
- Show progress or staged status: extracting text, structuring document, saving locally.

## Expensive parsing / chunking risks

- [src/features/ingest/build/document-model.ts](c:\Users\clerc\Documents\Lee Project\src\features\ingest\build\document-model.ts) does full token, sentence, section, and chunk creation synchronously.
- [src/features/reader/engine/navigation.ts](c:\Users\clerc\Documents\Lee Project\src\features\reader\engine\navigation.ts) recreates runtime chunks for every chunk-size change.
- [src/components/reader/classic-reader-view.tsx](c:\Users\clerc\Documents\Lee Project\src\components\reader\classic-reader-view.tsx) and [src/components/reader/guided-line-view.tsx](c:\Users\clerc\Documents\Lee Project\src\components\reader\guided-line-view.tsx) recompute paragraph token sets in render.

## Memoization and state update boundaries

- Cache runtime chunk results by document id and chunk size.
- Precompute paragraph token ranges in the document payload or memoize by paragraph index.
- Split the reader into a playback-driven canvas subtree and a mostly static sidebar subtree.
- Use store selectors so autoplay ticks do not force unrelated control panels to re-render.

## Possible worker offloading

- Create a document-processing worker for heavy `extractDocumentFromFile` and `buildDocumentModel` workloads.
- Keep the API simple: input file metadata plus raw bytes or text, output extracted text and the built document model.
- Add fallback to main-thread processing for smaller documents and unsupported worker environments.

## Dexie read/write patterns

- Debounce `saveSession` on chunk changes and flush on pause, route leave, or unload.
- Debounce `saveReaderPreferences` instead of saving on every settings mutation render.
- Use `bulkGet` for recent-item document lookups or denormalize needed card metadata onto session/bookmark/highlight records.
- Add delete flows and cleanup transactions to prevent stale data buildup.

## Reader render loop efficiency

- Keep `setTimeout`-based autoplay if it remains stable, but confine its updates to the minimal playback state.
- Avoid re-rendering annotations, stats, and appearance controls on every chunk advance.
- For modes that render larger context, render only the active paragraph or line window.

## Metrics to track

- Text extraction duration.
- Document-model build duration.
- Runtime chunk derivation duration by chunk size.
- Time from import submit to reader route ready.
- Autoplay chunk advance drift and dropped frame symptoms.
- IndexedDB write count per minute during active reading.

## Concrete tests or measurements to add

- Add unit or benchmark-style tests for `buildDocumentModel` using a large synthetic document fixture.
- Add unit tests ensuring runtime chunk caching and paragraph range caching work as intended.
- Add a Playwright smoke flow that imports a large pasted document and asserts the UI remains responsive.
- Add developer-only logging or measurement hooks behind a non-production flag for ingest timing.

# 7. Architecture Upgrade Spec

## How to break down src/components/reader/reader-workspace.tsx into smaller responsibilities

- Create `use-reader-document.ts` for document/session/bookmark/highlight hydration.
- Create `use-reader-playback.ts` for autoplay lifecycle, timer scheduling, and play/pause transitions.
- Create `use-reader-persistence.ts` for debounced preferences and session persistence.
- Create `use-reader-annotations.ts` for save/delete/jump bookmark and highlight actions.
- Create `reader-canvas.tsx` for the central reading surface and primary transport controls.
- Create `reader-sidebar.tsx` for grouped panels.
- Create panel components for session goal, highlights, bookmarks, presets, appearance, playback, and document stats.

## Which logic should live in hooks, engine helpers, store actions, or persistence adapters

- Hooks:
  - Async hydration, autoplay lifecycle, persistence effects, and annotation commands.
- Engine helpers:
  - Chunk derivation, progress, paragraph token maps, anchor resolution, timing math.
- Store actions:
  - User-intent state only: set chunk, toggle play, update preferences, set active document.
- Persistence adapters:
  - All Dexie reads and writes, batched transactions, cleanup operations, and future schema-aware transforms.

## How to reduce coupling between UI controls and persistence/state orchestration

- Make UI panels dumb. They should receive values and callbacks, not import repositories.
- Let controller hooks translate UI intents into store changes and persistence side effects.
- Keep `ReaderWorkspace` as a composition shell, not the place where all business logic lives.
- Use stable action interfaces such as `onChangeChunkSize`, `onTogglePlayback`, `onSaveBookmark`, and `onSelectPreset`.

## How to preserve current behavior while refactoring

- Freeze current behavior with targeted component and Playwright tests before extracting logic.
- Move code in slices: hydration first, playback second, annotations third, settings panels last.
- Keep existing query param handling for `document`, `bookmark`, and `highlight` unchanged until new tests are green.
- Avoid schema migrations in the same pull request as major component decomposition unless required.

# 8. Testing Expansion Plan

## Unit tests to add

- Repository tests for document, session, bookmark, highlight, and preference operations using IndexedDB test setup.
- Timing tests for `reduceMotion`, `smartPacing`, and punctuation edge cases.
- Navigation tests for anchor recovery when token positions are near chunk boundaries.
- Document-model tests for heading-heavy markdown, very long paragraphs, and empty-content edge cases.

## Component tests to add

- `UploadPanel`: keyboard interaction, error announcement, file/paste switching, and progress state.
- `GoalSelector`: radio-group semantics, persistence, and selected-state announcement.
- `ReaderCanvas` or equivalent extracted components: transport controls, chunk-size adjustments, reduced-motion toggle, and aria status output.
- `LibraryList`: loading, empty, populated, and cleanup states.

## Playwright flows to add

- Keyboard-only first-run flow from landing to reader.
- Reader shortcut flow: next, previous, pause, bookmark, highlight.
- Empty library and document cleanup flows.
- Reduced-motion flow.
- Mobile viewport flow for landing, reader, and library.
- Error path for unsupported file type and no-text PDF.

## Regression risks to lock down

- Resume anchor accuracy when chunk size changes.
- Bookmark and highlight jump precision.
- Preferences persistence across reloads.
- Playback pause at the end of the document.
- Route query param handling for bookmark and highlight deep links.

## Accessibility and responsive test coverage

- Playwright checks for skip links, focus order, grouped controls, and visible focus styles.
- Mobile viewport tests for collapsed navigation and reader panel layout.
- Reduced-motion assertions with system preference emulation.

## What done means for validation

- `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm test:e2e` pass.
- New component tests cover the primary interactive surfaces.
- Playwright covers at least one keyboard-only, one reduced-motion, one mobile, and one error-path reader flow.
- Performance-sensitive helper changes are backed by explicit timing or budget checks.

# 9. Documentation Repair Plan

## What is outdated in README.md

- It still describes the repo as mostly scaffolded.
- It claims ingestion pipelines, playback timing, reader rendering, bookmark UI behavior, and persistence wiring are not built even though they are implemented.
- It does not describe the actual current reading loop or all four modes.

## What product claims should be updated

- Replace scaffold language with an honest public-alpha statement.
- State that Lee currently supports pasted text, Markdown, DOCX, and PDFs with selectable text.
- State clearly that scanned PDF OCR is intentionally out of scope for the current MVP.
- Describe local persistence for preferences, sessions, bookmarks, and highlights.

## What setup, architecture, and status sections should be added or rewritten

- Add `Current Product Loop`.
- Add `Supported Inputs and Limitations`.
- Add `Local-First and Privacy Model`.
- Add `Architecture Overview`.
- Add `Testing and Validation`.
- Add `Current Status` rewritten as shipped capability plus known gaps.

## How docs can better reflect current MVP maturity

- Use language like `working local-first reading alpha` rather than `first scaffold`.
- Document known quality priorities honestly: accessibility, large-document performance, and reader modularization.
- Include route summaries for landing, reader, library, privacy, and about pages.

# 10. Final Recommendation

The single most realistic path to a 9.0 in the next implementation cycle is to treat the reader as the quality center of the product. Do one cycle focused on reader architecture, accessibility, performance boundaries, and validation depth, then finish with a README rewrite that accurately represents the improved product. Do not spend the next cycle adding net-new surface area before those four foundations are complete.

Ranked top-10 task list:

1. Refactor [src/components/reader/reader-workspace.tsx](c:\Users\clerc\Documents\Lee Project\src\components\reader\reader-workspace.tsx) into hooks plus presentational components.
2. Remove duplicated mode state and add debounced persistence in [src/state/reader-store.ts](c:\Users\clerc\Documents\Lee Project\src\state\reader-store.ts) and [src/db/repositories.ts](c:\Users\clerc\Documents\Lee Project\src\db\repositories.ts).
3. Ship the accessibility foundation: skip links, landmarks, grouped controls, focus-visible system, and reduced-motion defaults.
4. Cache or precompute expensive reader derivations and split playback-driven rendering from static sidebar rendering.
5. Add worker-backed heavy ingest for large PDFs, DOCX files, and long pasted text.
6. Add component tests for upload, goal selection, reader controls, and library states.
7. Add Playwright flows for keyboard-only navigation, reduced motion, mobile layout, and import error paths.
8. Upgrade the library into a clearer working surface with document/session cleanup and better metadata.
9. Rewrite landing and reader route copy so the product framing matches what the app actually does now.
10. Rewrite [README.md](c:\Users\clerc\Documents\Lee Project\README.md) to reflect current capability, constraints, architecture, and validation.
