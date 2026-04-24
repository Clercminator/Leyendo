import { rmSync } from "node:fs";
import { resolve } from "node:path";

const nextDevPath = resolve(process.cwd(), ".next", "dev");

rmSync(nextDevPath, { recursive: true, force: true });