import './App.css'
import React, { useState } from 'react'
import { useUsers } from './hooks/useUsers'
import { useFiles } from './hooks/useFiles'
import { useBoards } from './hooks/useBoards'
import { useRealtimeProjects } from './hooks/useRealtimeProjects'
import ProjectsView from './components/ProjectsView'
import { supabase, handleSupabaseError } from './lib/supabaseClient'

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
      const { data, error } = await supabase.from('brickflow_data').select('*')
      if (error) {
        handleSupabaseError(error, 'Carregar projetos')
      } else if (data.length > 0 && data[0].data) {
        updateProjects(() => data[0].data)
        return
      }
    } catch (error) {
      handleSupabaseError(error, 'Carregar projetos')
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
