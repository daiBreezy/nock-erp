import path from "path"

/**
 * Where the prototype's server-side JSON / photo files live. Locally: `.data/` in the project. On Vercel the app
 * folder is read-only, so it uses /tmp — it works for a demo but can be wiped whenever Vercel restarts the server
 * (owner 2026-10-07: share the prototype as a link). The real system keeps this in Dev's database.
 */
export const DATA_DIR = process.env.VERCEL ? path.join("/tmp", "nock-erp-data") : path.join(process.cwd(), ".data")
