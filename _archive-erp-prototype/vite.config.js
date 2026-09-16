import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { cpSync } from 'node:fs'

export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'preserve-operation-modules',
    closeBundle() {
      for (const path of ['js', 'css', 'img', 'signin.html', 'form.html']) {
        cpSync(path, `dist/${path}`, { recursive: true })
      }
    }
  }],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { fs: { deny: ['.env', '.env.*', '**/.git/**', '**/.claude/**'] } }
})
