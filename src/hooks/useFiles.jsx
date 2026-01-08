import { useCallback, useState, useMemo } from 'react'
import { formatFileSize } from '../utils/formatFileSize'

export function useFiles(currentProject, currentSubProject, updateProjects) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // 1. LEITURA: Os arquivos agora vêm direto do estado do projeto (JSON)
  // Não fazemos mais 'fetch' do Supabase. Se o projeto carregou, os arquivos estão lá.
  const files = useMemo(() => {
    if (!currentSubProject?.boardData?.files?.files) return []
    return currentSubProject.boardData.files.files
  }, [currentSubProject])

  // 2. UPLOAD: Converte para Texto (Base64) e injeta no JSON do Projeto
  const handleFileUpload = useCallback(async (event) => {
    // Suporta tanto input normal quanto drag-and-drop
    const uploadedFiles = Array.from(event.target.files || event.dataTransfer?.files || [])
    if (!uploadedFiles.length || !currentSubProject || !updateProjects) return

    setIsUploading(true)

    try {
      // Processa todos os arquivos em paralelo
      const newFilesPromises = uploadedFiles.map(async (file) => {
        return new Promise((resolve) => {
          const reader = new FileReader()
          
          reader.onload = () => {
            resolve({
              id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: file.name,
              type: file.type,
              size: file.size,
              data: reader.result, // Aqui está o arquivo convertido em texto!
              uploadDate: new Date().toISOString(),
              uploadedBy: 'user', // Pode ser melhorado com currentUser se necessário
              projectId: currentProject.id,
              subProjectId: currentSubProject.id
            })
          }
          
          // Lê o arquivo como URL de dados (Base64)
          reader.readAsDataURL(file)
        })
      })

      const newFiles = await Promise.all(newFilesPromises)

      // 3. SALVAMENTO: Atualiza o estado global
      // O App.jsx vai perceber essa mudança e disparar o salvamento automático no Railway
      updateProjects(prevProjects => {
        return prevProjects.map(proj => {
          if (proj.id !== currentProject.id) return proj
          
          return {
            ...proj,
            subProjects: proj.subProjects.map(sub => {
              if (sub.id !== currentSubProject.id) return sub
              
              const currentFiles = sub.boardData?.files?.files || []
              return {
                ...sub,
                boardData: {
                  ...sub.boardData,
                  files: {
                    ...sub.boardData.files,
                    files: [...currentFiles, ...newFiles]
                  }
                }
              }
            })
          }
        })
      })

    } catch (error) {
      console.error('Erro no processamento do arquivo:', error)
      alert('Erro ao processar arquivo. Tente novamente.')
    } finally {
      setIsUploading(false)
      if (event.target) event.target.value = '' // Limpa o input
    }
  }, [currentProject, currentSubProject, updateProjects])

  // 4. DELETAR: Remove do JSON local (o sync salva depois)
  const handleDeleteFile = useCallback((fileId) => {
    if (!window.confirm('Tem certeza que deseja excluir este arquivo?')) return

    updateProjects(prevProjects => {
      return prevProjects.map(proj => {
        if (proj.id !== currentProject.id) return proj
        return {
          ...proj,
          subProjects: proj.subProjects.map(sub => {
            if (sub.id !== currentSubProject.id) return sub
            const currentFiles = sub.boardData?.files?.files || []
            return {
              ...sub,
              boardData: {
                ...sub.boardData,
                files: {
                  ...sub.boardData.files,
                  files: currentFiles.filter(f => f.id !== fileId)
                }
              }
            }
          })
        }
      })
    })
  }, [currentProject, currentSubProject, updateProjects])

  return {
    files,
    isDragging,
    setIsDragging,
    isUploading,
    handleFileUpload,
    handleDeleteFile,
    formatFileSize
  }
}
