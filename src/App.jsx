import './App.css'
import { useState } from 'react'
import { useUsers } from './hooks/useUsers'
import { useFiles } from './hooks/useFiles'
import { useBoards } from './hooks/useBoards'

export default function App() {
  const [projects, setProjects] = useState([])
  const [currentView, setCurrentView] = useState('home')
  const [currentProject, setCurrentProject] = useState(null)
  const [currentSubProject, setCurrentSubProject] = useState(null)
  const [currentBoardType, setCurrentBoardType] = useState('kanban')
  const [refreshKey, setRefreshKey] = useState(0)

  const updateProjects = (fn) => setProjects(prev => fn(prev))

  const { currentUser, isLoggedIn, showLoginModal, setShowLoginModal, showCreateUserModal, setShowCreateUserModal, handleLogin, handleCreateUser, handleLogout } = useUsers((key) => loadUserProjects(key))

  const { files, handleFileUpload } = useFiles(currentProject, currentSubProject, currentUser || {})

  const { getCurrentBoardData, updateCurrentBoardData } = useBoards(currentView, currentProject, currentSubProject, currentBoardType, updateProjects, setCurrentSubProject, setRefreshKey)

  function loadUserProjects() {}

  return (
    <div className="app">
      <h1>BrickFlow</h1>
      {isLoggedIn ? (
        <div>Bem-vindo, {currentUser.displayName}</div>
      ) : (
        <div>{showLoginModal && <button onClick={() => handleLogin('user','1234')}>Login</button>}</div>
      )}
    </div>
  )
}
