import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import WebApp from './web/WebApp.tsx'
import MobileApp from './app/MobileApp.tsx'
import { AuthProvider } from './auth/AuthContext.tsx'
import { detectMode } from './mode.ts'

// web/ กับ app/ แยกกันเป็นอิสระ — ใช้ร่วมกันได้เฉพาะ data / lib / auth / components (shared)
const mode = detectMode()
const Root = mode === 'app' ? MobileApp : WebApp
// ชื่อแท็บบอกโหมด — เปิด Web กับ App คู่กันแล้วแยกออก (หน้าที่ตั้งชื่อเองจะทับค่านี้)
document.title = mode === 'app' ? 'NockAcademy · App' : 'NockAcademy · Web'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
