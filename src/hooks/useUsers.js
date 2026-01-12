import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

export function useUsers(_globalUsers, _updateGlobalUsers) {
  const [currentUser, setCurrentUser] = useState(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  const fetchMe = useCallback(async () => {
    const response = await fetch('/api/auth/me')
    if (!response.ok) {
      return null
    }
    const data = await response.json().catch(() => null)
    return data?.user || null
  }, [])

  useEffect(() => {
    let alive = true
    setIsAuthLoading(true)

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    const waitForServer = async () => {
      let backoffMs = 500
      while (alive) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 15000)
          const response = await fetch('/api/health', { signal: controller.signal })
          clearTimeout(timeoutId)

          if (response.ok) {
            return true
          }
        } catch {
          // server is likely waking up
        }

        await sleep(backoffMs)
        backoffMs = Math.min(3000, Math.floor(backoffMs * 1.5))
      }
      return false
    }

    ;(async () => {
      const ready = await waitForServer()
      if (!alive || !ready) return

      try {
        const user = await fetchMe()
        if (!alive) return

        if (user) {
          setCurrentUser(user)
          setIsLoggedIn(true)
          setShowLoginModal(false)
          setAuthError(null)
        } else {
          setCurrentUser(null)
          setIsLoggedIn(false)
          setShowLoginModal(true)
        }
      } catch {
        if (!alive) return
        setCurrentUser(null)
        setIsLoggedIn(false)
        setShowLoginModal(true)
      } finally {
        if (!alive) return
        setIsAuthLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [fetchMe])

  const handleLogin = useCallback(async (username, pin) => {
    setAuthError(null)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin })
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const message = data?.error || 'Falha no login'
        setAuthError(message)
        toast.error(message)
        return false
      }

      setCurrentUser(data.user)
      setIsLoggedIn(true)
      setShowLoginModal(false)
      setAuthError(null)
      return true
    } catch {
      setAuthError('Falha no login')
      toast.error('Falha no login')
      return false
    }
  }, [])

  const handleCreateUser = useCallback(async (userData) => {
    setAuthError(null)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = data?.error || 'Erro ao criar usuário'
        setAuthError(message)
        toast.error(message)
        return false
      }

      toast.success('Usuário criado! Faça login para continuar.')
      setShowCreateUserModal(false)
      setShowLoginModal(true)
      return true
    } catch {
      setAuthError('Erro ao criar usuário')
      toast.error('Erro ao criar usuário')
      return false
    }
  }, [])

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }

    setCurrentUser(null)
    setIsLoggedIn(false)
    setShowLoginModal(true)
    setAuthError(null)
  }, [])

  const handleSwitchUser = useCallback(() => {
    handleLogout()
  }, [handleLogout])

  return {
    currentUser,
    isLoggedIn,
    isAuthLoading,
    authError,
    showLoginModal,
    setShowLoginModal,
    showCreateUserModal,
    setShowCreateUserModal,
    handleLogin,
    handleCreateUser,
    handleLogout,
    handleSwitchUser
  }
}
