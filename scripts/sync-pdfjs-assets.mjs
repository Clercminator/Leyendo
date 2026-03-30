import { cp, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const pdfjsRoot = path.join(projectRoot, "node_modules", "pdfjs-dist");
const publicPdfjsRoot = path.join(projectRoot, "public", "pdfjs");

const assetCopies = [
  {
    from: path.join(pdfjsRoot, "legacy", "build", "pdf.worker.min.mjs"),
    to: path.join(publicPdfjsRoot, "pdf.worker.min.mjs"),
  },
  {
    from: path.join(pdfjsRoot, "cmaps"),
    to: path.join(publicPdfjsRoot, "cmaps"),
  },
  {
    from: path.join(pdfjsRoot, "iccs"),
    to: path.join(publicPdfjsRoot, "iccs"),
  },
  {
    from: path.join(pdfjsRoot, "standard_fonts"),
    to: path.join(publicPdfjsRoot, "standard_fonts"),
  },
  {
    from: path.join(pdfjsRoot, "wasm"),
    to: path.join(publicPdfjsRoot, "wasm"),
  },
];

async function copyAsset(from, to) {
  const sourceStats = await stat(from);

  if (sourceStats.isDirectory()) {
    await cp(from, to, { force: true, recursive: true });
    return;
  }

  await mkdir(path.dirname(to), { recursive: true });
  await cp(from, to, { force: true });
}

await mkdir(publicPdfjsRoot, { recursive: true });
await Promise.all(assetCopies.map(({ from, to }) => copyAsset(from, to)));
