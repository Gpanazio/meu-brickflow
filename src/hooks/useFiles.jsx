import { useCallback, useEffect, useMemo, useState } from 'react'
import { debugLog } from '../utils/debugLog'
import { formatFileSize } from '../utils/formatFileSize'
import { supabase, handleSupabaseError } from '../lib/supabaseClient'

export function useFiles(currentProject, currentSubProject, currentUser) {
  const [files, setFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  const saveFileToSupabase = useCallback(async (fileData) => {
    const { error } = await supabase.from('brickflow_files').insert(fileData)
    handleSupabaseError(error, 'Salvar arquivo')
  }, [])

  const loadFilesFromSupabase = useCallback(async () => {
    const { data, error } = await supabase
      .from('brickflow_files')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      handleSupabaseError(error, 'Carregar arquivos')
      return
    }
    setFiles(data)
  }, [])

  const deleteFileFromSupabase = useCallback(async (fileId) => {
    const { error } = await supabase.from('brickflow_files').delete().eq('id', fileId)
    handleSupabaseError(error, 'Deletar arquivo')
  }, [])

  useEffect(() => {
    if (currentSubProject) {
      loadFilesFromSupabase()
    }
  }, [currentSubProject, loadFilesFromSupabase])

  const currentFiles = useMemo(() => {
    if (!currentSubProject || !files) return []
    return files.filter(
      file =>
        file.projectId === currentProject?.id &&
        file.subProjectId === currentSubProject.id
    )
  }, [currentProject?.id, currentSubProject, files])

  const getCurrentFiles = useCallback(() => currentFiles, [currentFiles])

  const handleFileUpload = useCallback(async (event) => {
    const uploadedFiles = Array.from(event.target.files)
    const currentSubProjectId = currentSubProject?.id
    const currentSubProjectName = currentSubProject?.name
    if (!uploadedFiles.length || !currentSubProjectId) return

    const uploadDate = new Date().toISOString()

    try {
      const results = await Promise.allSettled(
        uploadedFiles.map(async (file) => {
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = (error) => reject(error)
            reader.readAsDataURL(file)
          })

          const fileData = {
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64,
            uploadDate,
            uploadedBy: currentUser.username,
            projectId: currentProject?.id,
            subProjectId: currentSubProjectId,
            projectName: currentProject?.name,
            subProjectName: currentSubProjectName
          }

          await saveFileToSupabase(fileData)
        })
      )
      const failedUploads = results.filter((result) => result.status === 'rejected')
      if (failedUploads.length > 0) {
        debugLog(`❌ ${failedUploads.length} arquivo(s) falharam ao enviar.`, failedUploads)
      }
      await loadFilesFromSupabase()
    } catch (error) {
      debugLog('❌ Erro inesperado durante o upload em lote:', error.message)
    }
    event.target.value = ''
  }, [currentProject?.id, currentProject?.name, currentSubProject?.id, currentSubProject?.name, currentUser.username, loadFilesFromSupabase, saveFileToSupabase])

  const handlePreviewFile = useCallback((file) => {
    setPreviewFile(file)
    setShowPreviewModal(true)
  }, [])

  const handleDownloadFile = useCallback((file) => {
    const link = document.createElement('a')
    link.href = file.data
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  const handleDeleteFile = useCallback(async (fileId) => {
    const confirmed = window.confirm('Tem certeza que deseja excluir este arquivo?')
    if (!confirmed) return
    await deleteFileFromSupabase(fileId)
    await loadFilesFromSupabase()
  }, [deleteFileFromSupabase, loadFilesFromSupabase])

  return {
    files,
    setFiles,
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
