import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import WebApp from './web/WebApp.tsx'
import MobileApp from './app/MobileApp.tsx'
import { AuthProvider } from './auth/AuthContext.tsx'
import { detectMode } from './mode.ts'

// web/ กับ app/ แยกกันเป็นอิสระ — ใช้ร่วมกันได้เฉพาะ data / lib / auth / components (shared)
const Root = detectMode() === 'app' ? MobileApp : WebApp

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
