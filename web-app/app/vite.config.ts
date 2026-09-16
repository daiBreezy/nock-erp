import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.avif': 'image/avif', '.webp': 'image/webp', '.gif': 'image/gif',
}

function staticFrom(dir: string) {
  return (req: any, res: any, next: any) => {
    const rel = decodeURIComponent((req.url || '/').split('?')[0])
    const file = path.join(dir, rel)
    if (file.startsWith(dir) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream')
      fs.createReadStream(file).pipe(res)
    } else next()
  }
}

// เสิร์ฟหน้า marketing (prototypes/*.html) ที่ /site/* + assets ที่ /assets/*
// origin เดียวกับแอป → Marketing ↔ Learn เด้งไปมากันเองแบบ local
function serveMarketing() {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  return {
    name: 'serve-marketing',
    configureServer(server: any) {
      server.middlewares.use('/site', staticFrom(path.join(projectRoot, 'prototypes')))
      server.middlewares.use('/assets', staticFrom(path.join(projectRoot, 'assets')))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './', // relative path เพื่อให้เปิดไฟล์ตรงๆ (file://) ได้
  plugins: [react(), viteSingleFile(), serveMarketing()],
})
