import fs from "node:fs";
import path from "node:path";

/** Reads a file from /docs at build time (server only). Returns a clear note if the file is missing. */
export function readDoc(name: string): string {
  try {
    return fs.readFileSync(path.join(process.cwd(), "docs", name), "utf8");
  } catch {
    return `docs/${name} was not found at build time.`;
  }
}
