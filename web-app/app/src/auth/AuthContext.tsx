import { createContext, useContext, useState, type ReactNode } from 'react'

export type Tier = 'guest' | 'free' | 'premium'

type AuthState = {
  isLoggedIn: boolean
  tier: Tier
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)
const KEY = 'nock.auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem(KEY) === '1')
  // tier ของ user — ตอนนี้ default 'free' (Logic จริงค่อยต่อทีหลัง)
  const [tier] = useState<Tier>('free')

  const login = () => {
    localStorage.setItem(KEY, '1')
    setIsLoggedIn(true)
  }
  const logout = () => {
    localStorage.removeItem(KEY)
    setIsLoggedIn(false)
  }

  return <AuthContext.Provider value={{ isLoggedIn, tier, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
