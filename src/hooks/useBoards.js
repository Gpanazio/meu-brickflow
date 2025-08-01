import { useCallback } from 'react'
import { debugLog } from '../utils/debugLog'

export function useBoards(currentView, currentProject, currentSubProject, currentBoardType, updateProjects, setCurrentSubProject, setRefreshKey) {
  const getCurrentBoardData = useCallback(() => {
    if (currentView === 'subproject' && currentSubProject) {
      return currentSubProject.boardData?.[currentBoardType] || {}
    } else if (currentView === 'project' && currentProject) {
      return currentProject.boardData?.[currentBoardType] || {}
    }
    return {}
  }, [currentView, currentProject, currentSubProject, currentBoardType])

  const updateCurrentBoardData = useCallback((newData) => {
    if (!currentSubProject || !currentProject) return

    updateProjects(prevProjects => {
      return prevProjects.map(project => {
        if (project.id === currentProject.id) {
          return {
            ...project,
            subProjects: project.subProjects.map(sub => {
              if (sub.id === currentSubProject.id) {
                return {
                  ...sub,
                  boardData: {
                    ...sub.boardData,
                    [currentBoardType]: newData
                  }
                }
              }
              return sub
            })
          }
        }
        return project
      })
    })

    setCurrentSubProject(prev => ({
      ...prev,
      boardData: {
        ...prev.boardData,
        [currentBoardType]: newData
      }
    }))

    setRefreshKey(prev => prev + 1)
    debugLog('Atualizando board data:', newData)
  }, [currentSubProject, currentProject, currentBoardType, updateProjects, setCurrentSubProject, setRefreshKey])

  return { getCurrentBoardData, updateCurrentBoardData }
}
