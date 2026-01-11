import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { isValidGuestToken, createGuestUser, ROLES } from '../utils/accessControl'

export function useUsers(globalUsers, updateGlobalUsers) {
  const safeUsers = useMemo(() => (Array.isArray(globalUsers) ? globalUsers : []), [globalUsers])
  const [currentUser, setCurrentUser] = useState(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Tenta recuperar a *Sessão* (quem eu sou) ao recarregar a página
  useEffect(() => {
    // Verifica se há token de convidado na URL
    const urlParams = new URLSearchParams(window.location.search)
    const guestToken = urlParams.get('guest')

    if (guestToken && isValidGuestToken(guestToken)) {
      // Login automático como convidado
      const guestUser = createGuestUser(guestToken)
      setCurrentUser(guestUser)
      setIsLoggedIn(true)
      setShowLoginModal(false)
      // Salva sessão de convidado
      localStorage.setItem('brickflow-session-user', JSON.stringify(guestUser))
      toast.success('Você entrou como convidado (somente leitura)')
      return
    }

    const savedSession = localStorage.getItem('brickflow-session-user')
    if (savedSession) {
      const parsedSession = JSON.parse(savedSession)

      // Se for convidado, mantém a sessão sem verificar no banco
      if (parsedSession.isGuest) {
        setCurrentUser(parsedSession)
        setIsLoggedIn(true)
        return
      }

      // Verifica se o usuário da sessão ainda existe no banco
      const userStillExists = safeUsers.find(u => u.username.toLowerCase() === parsedSession.username.toLowerCase())

      if (userStillExists) {
        // Atualiza com os dados mais recentes do banco (caso tenha mudado avatar/cor)
        setCurrentUser(userStillExists)
        setIsLoggedIn(true)
      } else if (globalUsers && globalUsers.length > 0) {
        // Se o usuário foi deletado do banco, desloga
        localStorage.removeItem('brickflow-session-user')
        setShowLoginModal(true)
      }
    } else if (globalUsers && globalUsers.length > 0) {
      setShowLoginModal(true)
    }
  }, [safeUsers]) // Roda sempre que a lista de usuários do banco carregar

  const handleLogin = (username, pin) => {
    if (!safeUsers.length) return

    const user = safeUsers.find(u => 
      u.username.toLowerCase() === username.toLowerCase()
    )

    if (user) {
      // Logic for hashed passwords will be added in the next step
      setCurrentUser(user)
      setIsLoggedIn(true)
      setShowLoginModal(false)
      localStorage.setItem('brickflow-session-user', JSON.stringify(user))
    } else {
      toast.error('Usuário ou PIN incorretos.')
    }
  }

  const handleCreateUser = (userData) => {
    if (!safeUsers.length) return

    const existing = safeUsers.find(u => 
      u.username.toLowerCase() === userData.username.toLowerCase()
    )
    if (existing) {
      toast.error('Este nome de usuário já está em uso.')
      return
    }
    
    // Adiciona verificação extra para garantir que não haja duplicatas
    if (safeUsers.some(u => u.username.toLowerCase() === userData.username.toLowerCase())) {
      toast.error('Usuário já existe.')
      return
    }

    const newUser = { 
      ...userData, 
      role: ROLES.OWNER, // Default role for new users
      userKey: `${userData.username}-${userData.pin}`,
      createdAt: new Date().toISOString()
    }
    
    // Atualiza a lista GLOBAL (que será salva no banco pelo App.jsx)
    const newUsersList = [...safeUsers, newUser]
    updateGlobalUsers(newUsersList)

    // Loga automaticamente
    setCurrentUser(newUser)
    setIsLoggedIn(true)
    setShowCreateUserModal(false)
    setShowLoginModal(false)
    localStorage.setItem('brickflow-session-user', JSON.stringify(newUser))
    toast.success('Usuário criado e salvo no Banco de Dados!')
  }

  const handleLogout = () => {
    localStorage.removeItem('brickflow-session-user')
    setCurrentUser(null)
    setIsLoggedIn(false)
    setShowLoginModal(true)
  }

  const handleSwitchUser = () => {
    setCurrentUser(null)
    setIsLoggedIn(false)
    setShowLoginModal(true)
  }

  return {
    currentUser,
    isLoggedIn,
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
