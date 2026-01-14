import { useCallback, useState, useMemo } from 'react'
import { formatFileSize } from '../utils/formatFileSize'
import { generateId } from '../utils/ids'

export function useFiles(currentProject, currentSubProject, updateProjects) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Limite de 50MB em bytes
  const MAX_SIZE_BYTES = 50 * 1024 * 1024;

  const files = useMemo(() => {
    const rawFiles = currentSubProject?.boardData?.files?.files
    return Array.isArray(rawFiles) ? rawFiles : []
  }, [currentSubProject])

  const handleFileUpload = useCallback(async (event) => {
    const uploadedFiles = Array.from(event.target.files || event.dataTransfer?.files || [])
    if (!uploadedFiles.length || !currentSubProject || !updateProjects) return

    // Filtra arquivos muito grandes antes de processar
    const validFiles = uploadedFiles.filter(file => {
      if (file.size > MAX_SIZE_BYTES) {
        alert(`O arquivo "${file.name}" é muito grande! O limite é 50MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setIsUploading(true)

    try {
      const newFilesPromises = validFiles.map(async (file) => {
        return new Promise((resolve) => {
          const reader = new FileReader()
           reader.onload = () => {
             resolve({
               id: generateId('file'),
               name: file.name,
               type: file.type,
               size: file.size,
               data: reader.result, // Base64
               uploadDate: new Date().toISOString(),
               projectId: currentProject.id,
               subProjectId: currentSubProject.id
             })
           }
          reader.readAsDataURL(file)
        })
      })

      const newFiles = await Promise.all(newFilesPromises)

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
      console.error('Erro no upload:', error)
      alert('Erro ao processar arquivo.')
    } finally {
      setIsUploading(false)
      if (event.target) event.target.value = ''
    }
  }, [currentProject, currentSubProject, updateProjects, MAX_SIZE_BYTES])

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
