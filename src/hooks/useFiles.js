import { useState, useEffect } from 'react'
import { debugLog } from '../utils/debugLog'
import { supabase, handleSupabaseError } from '../lib/supabaseClient'

export function useFiles(currentProject, currentSubProject, currentUser) {
  const [files, setFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  const saveFileToSupabase = async (fileData) => {
    const { error } = await supabase.from('brickflow_files').insert(fileData)
    handleSupabaseError(error, 'Salvar arquivo')
  }

  const loadFilesFromSupabase = async () => {
    const { data, error } = await supabase
      .from('brickflow_files')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      handleSupabaseError(error, 'Carregar arquivos')
      return
    }
    setFiles(data)
  }

  const deleteFileFromSupabase = async (fileId) => {
    const { error } = await supabase.from('brickflow_files').delete().eq('id', fileId)
    handleSupabaseError(error, 'Deletar arquivo')
  }

  useEffect(() => {
    if (currentSubProject) {
      loadFilesFromSupabase()
    }
  }, [currentSubProject])

  const getCurrentFiles = () => {
    if (!currentSubProject || !files) return []
    return files.filter(
      file =>
        file.projectId === currentProject?.id &&
        file.subProjectId === currentSubProject.id
    )
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileUpload = async (event) => {
    const uploadedFiles = Array.from(event.target.files)
    if (!uploadedFiles.length || !currentSubProject) return

    for (const file of uploadedFiles) {
      try {
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.readAsDataURL(file)
        })

        const fileData = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64,
          uploadDate: new Date().toISOString(),
          uploadedBy: currentUser.username,
          projectId: currentProject?.id,
          subProjectId: currentSubProject?.id,
          projectName: currentProject?.name,
          subProjectName: currentSubProject?.name
        }

        await saveFileToSupabase(fileData)
      } catch (error) {
        debugLog('❌ Erro no upload:', error.message)
      }
    }
    event.target.value = ''
  }

  const handlePreviewFile = (file) => {
    setPreviewFile(file)
    setShowPreviewModal(true)
  }

  const handleDownloadFile = (file) => {
    const link = document.createElement('a')
    link.href = file.data
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDeleteFile = async (fileId) => {
    if (!confirm('Tem certeza que deseja excluir este arquivo?')) return
    await deleteFileFromSupabase(fileId)
    loadFilesFromSupabase()
  }

  return {
    files,
    isDragging,
    setIsDragging,
    previewFile,
    showPreviewModal,
    setShowPreviewModal,
    handleFileUpload,
    handlePreviewFile,
    handleDownloadFile,
    handleDeleteFile,
    getCurrentFiles,
    formatFileSize
  }
}
