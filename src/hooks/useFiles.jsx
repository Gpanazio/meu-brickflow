import { useState, useEffect } from 'react'
import { debugLog } from '../utils/debugLog'
import { formatFileSize } from '../utils/formatFileSize'
import { supabase, handleSupabaseError } from '../lib/supabaseClient'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '../components/ui/alert-dialog'

export function useFiles(currentProject, currentSubProject, currentUser) {
  const [files, setFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [fileToDelete, setFileToDelete] = useState(null)

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
        await loadFilesFromSupabase()
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

  const handleDeleteFile = (fileId) => {
    setFileToDelete(fileId)
    setShowDeleteDialog(true)
  }

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return
    await deleteFileFromSupabase(fileToDelete)
    await loadFilesFromSupabase()
    setShowDeleteDialog(false)
    setFileToDelete(null)
  }

  const handleDialogOpenChange = (open) => {
    setShowDeleteDialog(open)
    if (!open) setFileToDelete(null)
  }

  const DeleteFileDialog = () => (
    <AlertDialog open={showDeleteDialog} onOpenChange={handleDialogOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir este arquivo?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDeleteFile}>Excluir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

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
    DeleteFileDialog,
    getCurrentFiles,
    formatFileSize
  }
}
