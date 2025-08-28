import { useState, useEffect } from 'react'
import { supabase, handleSupabaseError } from '../lib/supabaseClient'
import { toast } from 'sonner'

export function useUsers(loadUserProjects) {
  const [currentUser, setCurrentUser] = useState(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [allUsers, setAllUsers] = useState([])

  const saveUserToSupabase = async (userData) => {
    const { data: existingUsers, error: checkError } = await supabase
      .from('brickflow_users')
      .select('*')
      .eq('username', userData.username)

    if (checkError) {
      handleSupabaseError(checkError, 'Verificar usuário')
      return
    }

    if (existingUsers && existingUsers.length > 0) {
      const { error: updateError } = await supabase
        .from('brickflow_users')
        .update({
          displayName: userData.displayName,
          avatar: userData.avatar,
          color: userData.color,
          pin: userData.pin
        })
        .eq('username', userData.username)

      handleSupabaseError(updateError, 'Atualizar usuário')
    } else {
      const userDataForSupabase = {
        username: userData.username,
        displayName: userData.displayName,
        avatar: userData.avatar,
        color: userData.color,
        pin: userData.pin
      }

      const { error: insertError } = await supabase
        .from('brickflow_users')
        .insert(userDataForSupabase)

      handleSupabaseError(insertError, 'Salvar usuário')
    }
  }

  const loadUsersFromSupabase = async () => {
    const { data, error } = await supabase.from('brickflow_users').select('*')
    if (error) {
      handleSupabaseError(error, 'Carregar usuários')
      return []
    }
    return data || []
  }

  const handleLogin = async (username, pin) => {
    const userKey = `${username.toLowerCase()}-${pin}`
    const { data: supabaseUser, error } = await supabase
      .from('brickflow_users')
      .select('*')
      .eq('username', username)
      .eq('pin', pin)
      .maybeSingle()

    handleSupabaseError(error, 'Verificar usuário')

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

    const savedUserData = localStorage.getItem(`brickflow-user-${userKey}`)
    if (savedUserData) {
      const userData = JSON.parse(savedUserData)
      setCurrentUser(userData)
      setIsLoggedIn(true)
      setShowLoginModal(false)
      loadUserProjects && loadUserProjects(userKey)
    } else {
      toast.error('Usuário não encontrado! Clique em "Criar Usuário" para se cadastrar.')
    }
  }

  const handleCreateUser = async (userData) => {
    const userKey = `${userData.username.toLowerCase()}-${userData.pin}`
    const users = await loadUsersFromSupabase()
    const existingUser = users.find(u => u.username === userData.username)
    if (existingUser) {
      toast.error('Este usuário já existe! Tente fazer login ou escolha outro nome.')
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
