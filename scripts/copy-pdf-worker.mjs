// Keeps public/pdf.worker.min.mjs in lockstep with the installed pdfjs-dist
// version. pdf.js throws at runtime if the API and worker versions differ,
// so this must run on every install, not just when pdfjs-dist is bumped.
import { copyFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const dest = join(__dirname, "..", "public", "pdf.worker.min.mjs");

copyFileSync(src, dest);
