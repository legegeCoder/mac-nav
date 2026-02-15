import { useState, useCallback, useEffect } from 'react'

const TOKEN_KEY = 'nav-auth-token'

export function useAuth() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY)
  )
  const [verifyStatus, setVerifyStatus] = useState<'pending' | 'done'>(
    () => localStorage.getItem(TOKEN_KEY) ? 'pending' : 'done'
  )

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (!stored) return
    fetch('/api/verify', {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then((res) => {
        if (!res.ok) {
          localStorage.removeItem(TOKEN_KEY)
          setToken(null)
        }
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
      })
      .finally(() => setVerifyStatus('done'))
  }, [])

  const login = useCallback(async (password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) return false
      const { token: t } = await res.json()
      localStorage.setItem(TOKEN_KEY, t)
      setToken(t)
      return true
    } catch {
      return false
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
  }, [])

  return { token, isLoggedIn: !!token, verifying: verifyStatus === 'pending', login, logout }
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}
