import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

export function useUsers(_globalUsers, _updateGlobalUsers) {
  const [currentUser, setCurrentUser] = useState(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [isDatabaseReady, setIsDatabaseReady] = useState(false)
  const [authError, setAuthError] = useState(null)

  const fetchMe = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (!response.ok) {
        return null
      }
      const data = await response.json().catch(() => null)
      return data?.user || null
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    let alive = true
    setIsAuthLoading(true)
    setIsDatabaseReady(false)

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    const waitForServer = async () => {
      let backoffMs = 500
      const startedAt = Date.now()
      const maxWaitMs = 120000 // 2 minutes max wait

      while (alive) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 30000)
          
          try {
            const response = await fetch('/api/health', { signal: controller.signal })
            
            if (response.ok) {
              return 'ready'
            }

            if (response.status === 503) {
              const payload = await response.json().catch(() => null)
              if (payload?.code === 'MISSING_DATABASE_URL') {
                return 'db_missing'
              }
            }
          } finally {
            clearTimeout(timeoutId)
          }
        } catch {
          // server is likely waking up or network error
        }

        if (Date.now() - startedAt > maxWaitMs) {
          return 'timeout'
        }

        await sleep(backoffMs)
        backoffMs = Math.min(5000, Math.floor(backoffMs * 1.5))
      }
      return 'aborted'
    }

    ;(async () => {
      const status = await waitForServer()
      if (!alive) return

      if (status === 'ready') {
        setIsDatabaseReady(true)
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
      } else {
        setIsDatabaseReady(false)
        setIsAuthLoading(false)
        setCurrentUser(null)
        setIsLoggedIn(false)
        
        if (status === 'db_missing') {
          setAuthError('Configuração do Banco de Dados faltando (DATABASE_URL).')
        } else {
          setAuthError('Não foi possível conectar ao servidor. Tente recarregar a página.')
        }
      }
    })()

    return () => {
      alive = false
    }
  }, [fetchMe])

  const handleLogin = useCallback(async (username, pin) => {
    if (!isDatabaseReady) {
      toast.error('Aguardando conexão com o banco de dados...')
      return false
    }
    
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
  }, [isDatabaseReady])

  const handleCreateUser = useCallback(async (userData) => {
    if (!isDatabaseReady) return false
    
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
  }, [isDatabaseReady])

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
    isDatabaseReady,
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
