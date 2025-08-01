import { useState, useEffect } from 'react'
import { debugLog } from '../utils/debugLog'

export function useUsers(loadUserProjects) {
  const [currentUser, setCurrentUser] = useState(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [allUsers, setAllUsers] = useState([])

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

  const saveUserToSupabase = async (userData) => {
    try {
      const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/brickflow_users?username=eq.${userData.username}`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      })

      if (checkResponse.ok) {
        const existingUsers = await checkResponse.json()
        if (existingUsers.length > 0) {
          await fetch(`${SUPABASE_URL}/rest/v1/brickflow_users?username=eq.${userData.username}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              displayName: userData.displayName,
              avatar: userData.avatar,
              color: userData.color,
              pin: userData.pin
            })
          })
        } else {
          const userDataForSupabase = {
            username: userData.username,
            displayName: userData.displayName,
            avatar: userData.avatar,
            color: userData.color,
            pin: userData.pin
          }

          await fetch(`${SUPABASE_URL}/rest/v1/brickflow_users`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(userDataForSupabase)
          })
        }
      }
    } catch (error) {
      debugLog('⚠️ Erro ao salvar usuário no Supabase:', error.message)
    }
  }

  const loadUsersFromSupabase = async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/brickflow_users`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      })

      if (response.ok) {
        return response.json()
      }
    } catch (error) {
      debugLog('⚠️ Erro ao carregar usuários do Supabase:', error.message)
    }
    return []
  }

  const handleLogin = async (username, pin) => {
    const userKey = `${username.toLowerCase()}-${pin}`
    try {
      const users = await loadUsersFromSupabase()
      const supabaseUser = users.find(user => user.username === username && user.pin === pin)

      if (supabaseUser) {
        const userData = {
          userKey,
          username: supabaseUser.username,
          displayName: supabaseUser.displayName,
          avatar: supabaseUser.avatar,
          color: supabaseUser.color,
          createdAt: supabaseUser.created_at
        }
        setCurrentUser(userData)
        setIsLoggedIn(true)
        setShowLoginModal(false)
        localStorage.setItem(`brickflow-user-${userKey}`, JSON.stringify(userData))
        loadUserProjects && loadUserProjects(userKey)
        return
      }
    } catch (error) {
      debugLog('⚠️ Erro ao verificar usuário no Supabase:', error.message)
    }

    const savedUserData = localStorage.getItem(`brickflow-user-${userKey}`)
    if (savedUserData) {
      const userData = JSON.parse(savedUserData)
      setCurrentUser(userData)
      setIsLoggedIn(true)
      setShowLoginModal(false)
      loadUserProjects && loadUserProjects(userKey)
    } else {
      alert('Usuário não encontrado! Clique em "Criar Usuário" para se cadastrar.')
    }
  }

  const handleCreateUser = async (userData) => {
    const userKey = `${userData.username.toLowerCase()}-${userData.pin}`
    const users = await loadUsersFromSupabase()
    const existingUser = users.find(u => u.username === userData.username)
    if (existingUser) {
      alert('Este usuário já existe! Tente fazer login ou escolha outro nome.')
      return
    }

    const newUser = {
      userKey,
      username: userData.username,
      displayName: userData.displayName,
      avatar: userData.avatar,
      color: userData.color,
      pin: userData.pin,
      createdAt: new Date().toISOString()
    }

    await saveUserToSupabase(newUser)
    localStorage.setItem(`brickflow-user-${userKey}`, JSON.stringify(newUser))
    localStorage.setItem('brickflow-current-user', JSON.stringify(newUser))
    setCurrentUser(newUser)
    setIsLoggedIn(true)
    setShowCreateUserModal(false)
    setShowLoginModal(false)
    loadUserProjects && loadUserProjects(userKey)
  }

  const handleLogout = () => {
    localStorage.removeItem('brickflow-current-user')
    setCurrentUser(null)
    setIsLoggedIn(false)
    setShowLoginModal(true)
  }

  const handleSwitchUser = () => {
    setCurrentUser(null)
    setIsLoggedIn(false)
    setShowLoginModal(true)
  }

  useEffect(() => {
    const savedUser = localStorage.getItem('brickflow-current-user')
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      setCurrentUser(userData)
      setIsLoggedIn(true)
      loadUserProjects && loadUserProjects(userData.userKey)
    } else {
      setShowLoginModal(true)
    }
  }, [])

  useEffect(() => {
    if (currentUser && isLoggedIn) {
      localStorage.setItem('brickflow-current-user', JSON.stringify(currentUser))
    }
  }, [currentUser, isLoggedIn])

  useEffect(() => {
    const loadAll = async () => {
      const users = await loadUsersFromSupabase()
      setAllUsers(users)
    }
    loadAll()
  }, [])

  return {
    currentUser,
    allUsers,
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
