# Lee

Lee is a local-first reading web app that helps people read documents faster without giving up control, comfort, or privacy.

In simple terms:

- you can paste text into the site or upload supported files,
- Lee turns that text into a structured reading model,
- you choose a reading style,
- the app helps you move through the text faster,
- and your progress stays on your device.

This README is the main documentation file for the project. It is written for beginner programmers, so it explains both what the project does and why the codebase is organized the way it is.

## What Problem Lee Is Trying To Solve

A lot of speed-reading tools feel too aggressive. They often focus only on raw speed and ignore real reading problems such as:

- losing your place,
- getting tired,
- needing to slow down for difficult sections,
- wanting to come back later,
- or not wanting to upload private documents to someone else's server.

Lee is designed to be a calmer alternative. The goal is not just to flash words quickly. The goal is to help users experiment with faster reading while still being able to pause, repeat, bookmark, highlight, and resume.

## What Users Can Do Right Now

At the current stage of the project, a user can:

- choose a reading goal on the landing page,
- paste plain text directly into the site,
- upload supported files,
- open the document in the reader,
- switch between four reading modes,
- adjust pace and presentation,
- save bookmarks and highlights,
- come back later and resume from the library,
- clear saved progress for a document,
- remove a document and its related local reading data.

## Quick Answers To Common Questions

### Can users simply copy and paste text into the site and read it faster?

Yes.

That is one of the main supported flows. The landing page has a paste mode where a user can:

1. paste text,
2. optionally name the document,
3. click `Open in reader`,
4. start reading in one of the available reading modes.

This is useful for articles, notes, essays, summaries, emails, or any other text a user already has.

### How many reading modes are available?

There are currently **4 reading modes**:

1. **Focus Word**
   Shows one word or a very small word group with a strong visual focus.

2. **Phrase Chunk**
   Shows small groups of words so reading feels more natural than single-word flashing.

3. **Guided Line**
   Highlights a line or compact line group to reduce page scatter while keeping context.

4. **Classic Reader**
   Keeps a more traditional paragraph view but still supports guided progress and reader controls.

### Why these four modes?

Because different readers want different tradeoffs.

- Some want maximum focus.
- Some want speed with natural phrasing.
- Some want help tracking lines.
- Some want a safer fallback that still feels familiar.

These four modes cover the most useful early reading styles without making the product too complicated.

### Could we add more reading modes later?

Yes.

The code is intentionally built so the reader engine is **mode-agnostic**. That means the document model and navigation system do not depend on only one presentation style. In practice, this makes it possible to add more reader modes later without rewriting the whole app.

Examples of future modes we could add:

- sentence focus,
- paragraph stepping,
- study mode with notes side-by-side,
- dyslexia-friendly layouts,
- exam-prep mode,
- skim mode for headings and summaries only.

### How many file formats are supported?

Lee currently supports **6 input types**:

1. pasted text,
2. plain text files (`.txt`),
3. Markdown files (`.md`, `.markdown`),
4. DOCX files,
5. RTF files,
6. PDFs with selectable text.

### Are legacy `.doc` Word files supported?

No.

The app accepts modern `.docx` files and now supports `.rtf`, but old binary `.doc`
files are still out of scope for the browser-local pipeline. If you have a `.doc`
file, save it as `.docx` in Word or LibreOffice and then upload that version.

### Are scanned PDFs supported?

No.

If a PDF is just an image scan and does not contain selectable text, Lee cannot extract readable content from it yet. OCR is intentionally out of scope for the current version.

### How big can files be?

There are practical limits, and the app now enforces a browser-side cap for very large PDFs.

What the code does today:

- PDFs at or above **1.5 MB** are moved to a background worker for extraction.
- PDFs above **50 MB** are rejected with a clear error before extraction starts.
- Raw text at or above **120,000 characters** is moved to a background worker for document-model building.

What that means in practice:

- small and medium documents should work normally,
- larger documents are still supported,
- very large PDFs above the browser cap are rejected up front,
- the real limit depends on the user's device memory, browser, and CPU.

So the honest answer is:

- **yes, large files are supported better than before**, but
- **no, this project does not guarantee every very large browser-local PDF will be accepted**.

### Is this stack using the latest versions available?

Not always.

We use a **working compatible set of versions**, not a policy of "always upgrade everything immediately." That is a deliberate choice, because the newest version is not always the safest choice for a project in active development.

For example, a dependency check on `2026-03-26` showed that some packages in this repo are already behind the latest published versions, including:

- Dexie,
- Vitest,
- ESLint,
- TypeScript,
- `@types/node`.

So the correct beginner-friendly explanation is:

- some packages are current or recent,
- some are intentionally not on the absolute newest release,
- the goal is compatibility and stability first,
- upgrades should be done thoughtfully, not automatically.

## How Lee Works

Here is the high-level flow from user action to reader experience:

1. The user arrives on the landing page.
2. The user chooses a reading goal such as focus or speed.
3. The user either pastes text or uploads a supported file.
4. Lee detects the input type.
5. Lee extracts or normalizes text from that input.
6. Lee builds a structured document model.
7. The reader uses that model to create runtime reading chunks.
8. The user reads in one of the available modes.
9. Lee stores local progress, bookmarks, highlights, and preferences in IndexedDB.
10. The library page lets the user resume or reopen saved local content.

## How The Internals Work

This section explains the main concepts in plain language.

### Local-first

Local-first means the app tries to do its work **inside the user's browser** instead of sending documents to a remote server.

That matters because:

- it improves privacy,
- it reduces backend complexity,
- it makes the app usable without account setup,
- and it fits the product goal of personal reading support rather than cloud document hosting.

### Document extraction

Different file types need different extraction logic.

- Plain text can be read directly.
- Markdown is parsed so headings and list items can be recognized.
- DOCX is extracted with Mammoth.
- RTF is extracted with a lightweight in-browser parser.
- PDFs with selectable text are extracted with `pdfjs-dist`.

### Document model

Once text is extracted, Lee converts it into a structured model containing:

- blocks,
- sentences,
- tokens,
- chunks,
- and sections.

This matters because the reader should not treat a document as one giant string. A structured model makes it possible to:

- jump around safely,
- track progress,
- save anchors,
- rebuild chunks at different sizes,
- and support different reader modes.

### Runtime chunks

A **chunk** is a small reading unit, usually one word or a small phrase group.

Lee can derive different chunk layouts from the same saved document. That is why changing chunk size does not require re-importing the file.

### IndexedDB

IndexedDB is a browser database. In this project it stores:

- saved documents,
- reading sessions,
- bookmarks,
- highlights,
- reader preferences.

This is why a user can refresh the page and still come back to the same document on the same device and browser profile.

### Web workers

Web workers let the browser do heavy work in the background so the main page stays more responsive.

Lee uses workers for heavier tasks such as:

- large PDF extraction,
- large document-model building.

## Why This Tech Stack Was Chosen

The stack is not random. Each piece solves a specific problem in this app.

| Technology            | What It Does               | Why It Was Chosen                                                                                               |
| --------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Next.js 16 App Router | Main web framework         | Gives a strong project structure, routing, production builds, and modern React support                          |
| React 19              | UI library                 | Good fit for interactive interfaces with changing state like the reader and library                             |
| TypeScript            | Typed JavaScript           | Helps catch mistakes early and makes domain concepts like documents, sessions, and modes easier to reason about |
| Tailwind CSS v4       | Styling system             | Fast to build UI with, consistent across the app, and works well for design-heavy component work                |
| shadcn/ui             | UI building blocks         | Useful for reusable UI patterns without locking the project into a heavy component framework                    |
| Zustand               | Client state management    | Small and easy to understand, which is a good fit for reader state like playback, chunk index, and preferences  |
| Dexie                 | IndexedDB wrapper          | Makes browser database work much easier than using raw IndexedDB directly                                       |
| pdfjs-dist            | PDF text extraction        | Standard way to work with PDFs in the browser                                                                   |
| mammoth               | DOCX text extraction       | Good browser-side DOCX text extraction for this kind of app                                                     |
| Built-in RTF parser   | RTF text extraction        | Keeps rich-text import browser-local without adding a backend conversion step or a heavy parser dependency      |
| unified + remark      | Markdown parsing           | Lets the app understand headings, paragraphs, and list items instead of treating Markdown as plain text only    |
| Vitest                | Unit and component testing | Fast testing setup for logic and React-level behavior                                                           |
| Playwright            | End-to-end testing         | Useful for real browser flow testing such as upload, paste, reading, and resume                                 |

## Why Not Use Simpler Alternatives?

That depends on which part you mean.

### Why not plain JavaScript instead of TypeScript?

Because this project has a lot of structured data.

We are not just showing a few pages. We are managing:

- documents,
- sessions,
- bookmarks,
- highlights,
- modes,
- preferences,
- extracted file content,
- and reading positions.

TypeScript helps keep these data shapes consistent.

### Why not localStorage instead of IndexedDB?

Because localStorage is too limited for this use case.

It is fine for tiny values such as a theme toggle, but not ideal for storing full document payloads and reading history. IndexedDB is a better fit for larger local structured data.

### Why not a backend database already?

Because the current product goal is local-first reading, not cloud sync.

Adding a backend too early would create more complexity around:

- authentication,
- privacy,
- API design,
- hosting,
- syncing,
- and data ownership.

For the current stage, local storage is the simpler and more honest choice.

## Project Structure And Why It Looks Like This

The folder structure is organized by responsibility.

```text
src/
	app/                Route entry points, layout, and global styles
	components/         Reusable UI components
	db/                 Browser database schema and repository helpers
	features/           Domain logic grouped by feature area
	lib/                Shared utilities and instrumentation
	state/              Client-side state store
	types/              Shared TypeScript models
tests/
	component/          React component and hook tests
	e2e/                Full browser tests
	fixtures/           Large or shared test data
	unit/               Pure logic and repository tests
```

### Why this structure?

Because it separates the project into easier mental layers.

#### `src/app/`

This is the Next.js routing layer.

Use this folder when you want to know:

- what pages exist,
- what the root layout is,
- what global styles are applied.

#### `src/components/`

This is the UI layer.

Use this folder when you want to find:

- the upload panel,
- reader views,
- library cards,
- layout pieces,
- reusable widgets.

#### `src/features/`

This is where app-specific logic lives.

It is separated by major feature areas such as:

- ingestion,
- reader navigation,
- presets,
- timing.

This keeps business logic out of pages and away from random utility files.

#### `src/db/`

This is the local persistence layer.

It exists so database code stays in one place instead of being scattered across components.

#### `src/state/`

This holds app state that changes while the user is interacting with the reader.

Examples:

- whether playback is active,
- current chunk index,
- current reader preferences.

#### `src/types/`

This holds shared data shapes.

That makes it easier for the whole app to agree on what a document, highlight, or reading session is supposed to look like.

## Reading Modes In More Detail

| Mode           | What The User Sees                                  | Why It Exists                                                                  |
| -------------- | --------------------------------------------------- | ------------------------------------------------------------------------------ |
| Focus Word     | One word or a tiny cluster with strong visual focus | Best when the user wants very high concentration and less eye movement         |
| Phrase Chunk   | Small natural word groups                           | Best when the user wants more speed without making reading feel too mechanical |
| Guided Line    | A highlighted line or compact line group            | Best when the user wants help tracking where to look                           |
| Classic Reader | A familiar paragraph view with assistive controls   | Best when the user wants comfort, context, and an easier fallback              |

The point of having multiple modes is not novelty. It is flexibility. Different documents and different readers benefit from different presentation styles.

## Supported Inputs And Limits

### Currently supported

- pasted text,
- `.txt`,
- `.md` and `.markdown`,
- `.docx`,
- `.rtf`,
- `.pdf` with selectable text.

### Not currently supported

- legacy `.doc` Word files,
- scanned PDFs that require OCR,
- image-only documents,
- cloud file sources,
- remote syncing,
- backup import/export.

### Practical size guidance

The app currently has **processing thresholds**, not a hard universal cap:

- PDF extraction moves to a worker at **1.5 MB and above**.
- PDFs above **50 MB** are rejected before extraction to avoid browser hangs.
- Document-model building moves to a worker at **120,000 characters and above**.

That means:

- copy-paste text is absolutely supported,
- medium and fairly large documents are supported,
- but extremely large files still depend on browser and device performance.

## Current Routes

### `/`

Landing page with:

- product framing,
- onboarding goal selection,
- intake panel,
- reading mode gallery.

### `/reader`

Main reading workspace with:

- deep links to a document,
- bookmark and highlight jump support,
- playback controls,
- mode switching,
- local persistence.

### `/library`

Local library with:

- recent sessions,
- recent bookmarks,
- recent highlights,
- recent documents,
- cleanup actions.

### `/about`

Explains product intent and positioning.

### `/privacy`

Explains the local-first approach and the things intentionally not included in v1.

## Current Versions In This Repo

Important package versions currently pinned in `package.json` include:

- Next.js `16.2.1`
- React `19.2.4`
- React DOM `19.2.4`
- TypeScript `5.x`
- Tailwind CSS `4.x`
- Vitest `4.1.1`
- Playwright `1.58.2`

These are the versions the project is currently built and tested against.

## Getting Started

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:3000`.

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm test
pnpm test:watch
pnpm test:e2e
pnpm format
```

## Validation And Testing

The repo includes:

- linting,
- unit tests,
- component tests,
- production builds,
- end-to-end browser tests.

This is important because a reader app has a lot of subtle behavior to protect, such as:

- progress persistence,
- bookmark accuracy,
- highlight reopening,
- chunk navigation,
- upload flows,
- and resume behavior.

## Current Known Limits

- There is no browser-data export or import yet.
- There is no cloud sync yet.
- There is no OCR for scanned PDFs yet.
- The practical upper size limit for documents depends on browser and device resources.
- Storage-failure handling still needs to be improved.

## What Could Be Added Later

Good future directions include:

- export and import for local backup,
- OCR for scanned PDFs,
- more reading modes,
- more document formats,
- richer library metadata,
- stronger storage error recovery,
- optional sync.

## Final Summary

Lee should be understood as a **working local-first reading alpha**, not just a starter scaffold.

It already supports:

- paste and file-based input,
- multiple reading modes,
- local session persistence,
- bookmarks and highlights,
- resume and cleanup flows.

The biggest remaining gaps are not basic reader capability anymore. They are mostly about product maturity:

- better backup and export,
- stronger failure handling,
- and broader regression coverage.
