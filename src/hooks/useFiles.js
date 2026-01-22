import { useMemo, useState, useCallback } from 'react';
import { generateId } from '../utils/ids';
import { toast } from 'sonner';

const MAX_SIZE_BYTES = 50 * 1024 * 1024;

// Folder colors following BRICK brand (subtle variations)
export const FOLDER_COLORS = [
  { id: 'default', name: 'Padrão', bg: 'bg-zinc-800', border: 'border-zinc-700', icon: 'text-zinc-400' },
  { id: 'red', name: 'Vermelho', bg: 'bg-red-950/50', border: 'border-red-900', icon: 'text-red-500' },
  { id: 'white', name: 'Branco', bg: 'bg-zinc-900', border: 'border-zinc-600', icon: 'text-white' },
];

export function useFiles(currentProject, currentSubProject, updateProjects) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Folder Navigation State
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = root

  // Get raw files and folders from subproject
  const files = useMemo(() => {
    const rawFiles = currentSubProject?.boardData?.files?.files;
    return Array.isArray(rawFiles) ? rawFiles : [];
  }, [currentSubProject]);

  const folders = useMemo(() => {
    const rawFolders = currentSubProject?.boardData?.files?.folders;
    return Array.isArray(rawFolders) ? rawFolders : [];
  }, [currentSubProject]);

  // Get current folder object
  const currentFolder = useMemo(() => {
    if (!currentFolderId) return null;
    return folders.find(f => f.id === currentFolderId) || null;
  }, [folders, currentFolderId]);

  // Build breadcrumb path
  const currentFolderPath = useMemo(() => {
    const path = [{ id: null, name: 'Raiz' }];
    if (!currentFolderId) return path;

    let folder = folders.find(f => f.id === currentFolderId);
    const visited = new Set();
    const tempPath = [];

    while (folder && !visited.has(folder.id)) {
      visited.add(folder.id);
      tempPath.unshift({ id: folder.id, name: folder.name });
      folder = folder.parentId ? folders.find(f => f.id === folder.parentId) : null;
    }

    return [...path, ...tempPath];
  }, [folders, currentFolderId]);

  // Filter files in current folder
  const filesInCurrentFolder = useMemo(() => {
    return files.filter(f => (f.folderId || null) === currentFolderId);
  }, [files, currentFolderId]);

  // Filter subfolders in current folder
  const foldersInCurrentFolder = useMemo(() => {
    return folders.filter(f => (f.parentId || null) === currentFolderId);
  }, [folders, currentFolderId]);

  // Apply search/type/sort filters to files only (not folders)
  const filteredFiles = useMemo(() => {
    let result = [...filesInCurrentFolder];

    if (searchQuery.trim()) {
      result = result.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter(f => {
        const type = f.type?.toLowerCase() || '';
        switch (typeFilter) {
          case 'image': return type.includes('image');
          case 'pdf': return type.includes('pdf');
          case 'audio': return type.includes('audio');
          case 'video': return type.includes('video');
          case 'document':
            return type.includes('text') ||
              type.includes('document') ||
              type.includes('word') ||
              type.includes('excel') ||
              type.includes('powerpoint');
          default: return true;
        }
      });
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.uploadDate) - new Date(a.uploadDate);
        case 'oldest': return new Date(a.uploadDate) - new Date(b.uploadDate);
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'size-desc': return b.size - a.size;
        case 'size-asc': return a.size - b.size;
        default: return 0;
      }
    });

    return result;
  }, [filesInCurrentFolder, searchQuery, typeFilter, sortBy]);

  // Filter folders by search (show matching folders)
  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return foldersInCurrentFolder;
    return foldersInCurrentFolder.filter(f =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [foldersInCurrentFolder, searchQuery]);

  // Navigation
  const navigateToFolder = useCallback((folderId) => {
    setCurrentFolderId(folderId);
  }, []);

  const navigateUp = useCallback(() => {
    if (!currentFolder) return;
    setCurrentFolderId(currentFolder.parentId || null);
  }, [currentFolder]);

  // Helper to update boardData.files
  const updateFilesData = useCallback((updater) => {
    if (!currentProject || !currentSubProject || !updateProjects) return;

    updateProjects(projects => {
      if (!Array.isArray(projects)) return projects;
      return projects.map(p => {
        if (p.id !== currentProject?.id) return p;
        return {
          ...p,
          subProjects: (p.subProjects || []).map(sp => {
            if (sp.id !== currentSubProject?.id) return sp;
            const spBoardData = sp.boardData || {};
            const currentFilesData = spBoardData.files || { files: [], folders: [] };
            return {
              ...sp,
              boardData: {
                ...spBoardData,
                files: updater(currentFilesData)
              }
            };
          })
        };
      });
    });
  }, [currentProject, currentSubProject, updateProjects]);

  // Folder CRUD
  const handleCreateFolder = useCallback((name, color = 'default') => {
    if (!name.trim()) return;

    const newFolder = {
      id: generateId('folder'),
      name: name.trim(),
      parentId: currentFolderId,
      color,
      createdAt: new Date().toISOString()
    };

    updateFilesData(data => ({
      ...data,
      folders: [...(data.folders || []), newFolder]
    }));

    toast.success(`Pasta "${name}" criada!`);
    return newFolder;
  }, [currentFolderId, updateFilesData]);

  const handleRenameFolder = useCallback((folderId, newName) => {
    if (!newName.trim()) return;

    updateFilesData(data => ({
      ...data,
      folders: (data.folders || []).map(f =>
        f.id === folderId ? { ...f, name: newName.trim() } : f
      )
    }));

    toast.success('Pasta renomeada!');
  }, [updateFilesData]);

  const handleDeleteFolder = useCallback((folderId) => {
    // Move all files and subfolders in this folder back to parent (or root)
    const folder = folders.find(f => f.id === folderId);
    const targetParentId = folder?.parentId || null;

    updateFilesData(data => ({
      ...data,
      files: (data.files || []).map(f =>
        f.folderId === folderId ? { ...f, folderId: targetParentId } : f
      ),
      folders: (data.folders || [])
        .filter(f => f.id !== folderId)
        .map(f => f.parentId === folderId ? { ...f, parentId: targetParentId } : f)
    }));

    // If we're inside the deleted folder, navigate up
    if (currentFolderId === folderId) {
      setCurrentFolderId(targetParentId);
    }

    toast.success('Pasta excluída! Conteúdo movido para o nível anterior.');
  }, [folders, currentFolderId, updateFilesData]);

  const handleMoveFile = useCallback((fileId, targetFolderId) => {
    updateFilesData(data => ({
      ...data,
      files: (data.files || []).map(f =>
        f.id === fileId ? { ...f, folderId: targetFolderId } : f
      )
    }));

    toast.success('Arquivo movido!');
  }, [updateFilesData]);

  const handleChangeFolderColor = useCallback((folderId, color) => {
    updateFilesData(data => ({
      ...data,
      folders: (data.folders || []).map(f =>
        f.id === folderId ? { ...f, color } : f
      )
    }));
  }, [updateFilesData]);

  // File Upload (updated to include folderId)
  const handleFileUpload = useCallback(async (event) => {
    const uploadedFiles = Array.from(
      (event.target && event.target.files) ||
      (event.dataTransfer && event.dataTransfer.files) ||
      []
    );

    if (!uploadedFiles.length || !currentSubProject || !updateProjects) return;

    const validFiles = uploadedFiles.filter(file => {
      if (file.size > MAX_SIZE_BYTES) {
        toast.error(`Arquivo "${file.name}" muito grande!`, {
          description: `O limite é de 50MB.`
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setIsUploading(true);

    try {
      const newFilesPromises = validFiles.map(async (file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              id: generateId('file'),
              name: file.name,
              type: file.type,
              size: file.size,
              data: reader.result,
              uploadDate: new Date().toISOString(),
              projectId: currentProject?.id,
              subProjectId: currentSubProject?.id,
              folderId: currentFolderId // Upload to current folder
            });
          };
          reader.readAsDataURL(file);
        });
      });

      const newFiles = await Promise.all(newFilesPromises);

      updateFilesData(data => ({
        ...data,
        files: [...(data.files || []), ...newFiles]
      }));

      toast.success(`${newFiles.length} arquivo(s) enviados com sucesso!`);
    } catch (err) {
      console.error('Erro no upload:', err);
      toast.error('Erro ao fazer upload dos arquivos');
    } finally {
      setIsUploading(false);
    }
  }, [currentProject, currentSubProject, updateProjects, currentFolderId, updateFilesData]);

  // File Delete
  const handleDeleteFile = useCallback((fileId) => {
    updateFilesData(data => ({
      ...data,
      files: (data.files || []).filter(f => f.id !== fileId)
    }));
    toast.success('Arquivo excluído com sucesso');
  }, [updateFilesData]);

  return {
    // Files
    files,
    filteredFiles,
    handleFileUpload,
    handleDeleteFile,
    handleMoveFile,

    // Folders
    folders,
    filteredFolders,
    currentFolderId,
    currentFolder,
    currentFolderPath,
    navigateToFolder,
    navigateUp,
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleChangeFolderColor,

    // UI State
    isDragging,
    setIsDragging,
    isUploading,

    // Filters
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    sortBy,
    setSortBy
  };
}
