import './App.css'
import React, { useState } from 'react'
import { useUsers } from './hooks/useUsers'
import { useFiles } from './hooks/useFiles'
import { useBoards } from './hooks/useBoards'
import { useRealtimeProjects } from './hooks/useRealtimeProjects'
import ProjectsView from './components/ProjectsView'

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

  useRealtimeProjects(isLoggedIn, updateProjects)

  async function loadUserProjects(userKey) {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/brickflow_data`, {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.length > 0 && data[0].data) {
          updateProjects(() => data[0].data)
          return
        }
      }
    } catch (error) {
      console.error('Erro ao carregar projetos do Supabase:', error)
    }

    const saved = localStorage.getItem(`brickflow-projects-${userKey}`)
    if (saved) {
      updateProjects(() => JSON.parse(saved))
    } else {
      const initialProjects = []
      updateProjects(() => initialProjects)
      localStorage.setItem(`brickflow-projects-${userKey}`, JSON.stringify(initialProjects))
    }
  }

  return (
    <div className="app">
      <h1>BrickFlow</h1>
      {isLoggedIn ? (
        currentView === 'home' ? (
          <ProjectsView
            projects={projects}
            onSelect={(project) => {
              setCurrentProject(project)
              setCurrentView('project')
            }}
          />
        ) : (
          <div>
            <h2>{currentProject?.name}</h2>
            <button onClick={() => setCurrentView('home')}>Voltar</button>
          </div>
        )
      ) : (
        <div>
          {showLoginModal && (
            <button onClick={() => handleLogin('user', '1234')}>Login</button>
          )}
        </div>
      )}
    </div>
  )
}
