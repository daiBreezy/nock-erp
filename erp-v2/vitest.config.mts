import path from "node:path"
import { defineConfig } from "vitest/config"

// the "@/…" alias from tsconfig, so tests can load modules that use it (e.g. the demo seed)
export default defineConfig({ resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } } })
