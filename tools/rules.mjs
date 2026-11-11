// Shared constants for the check and publish scripts.

import { fileURLToPath } from "node:url";
import path from "node:path";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const FILES = ["index.html", "script.js", "style.css"];

// Every page must carry this exact policy. It is what stops a visitor's
// browser from ever contacting another server, whatever the page's code does.
export const CSP =
  "default-src 'none'; " +
  "script-src 'self' blob: 'wasm-unsafe-eval'; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src data: blob:; " +
  "media-src blob:; " +
  "worker-src blob:; " +
  "connect-src data: blob:; " +
  "base-uri 'none'; " +
  "form-action 'none'";

export const KINDS = ["interactive", "still"];
