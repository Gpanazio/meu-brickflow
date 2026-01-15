import { useMemo, useState, useCallback } from 'react';
import { generateId } from '../utils/ids';
import { toast } from 'sonner';

const MAX_SIZE_BYTES = 50 * 1024 * 1024;

export function useFiles(currentProject, currentSubProject, updateProjects) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'image' | 'pdf' | 'audio' | 'video' | 'document'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc'

  const files = useMemo(() => {
    const rawFiles = currentSubProject?.boardData?.files?.files;
    return Array.isArray(rawFiles) ? rawFiles : [];
  }, [currentSubProject]);

  const filteredFiles = useMemo(() => {
    let result = [...files];

    // Apply search filter
    if (searchQuery.trim()) {
      result = result.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
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

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.uploadDate) - new Date(a.uploadDate);
        case 'oldest':
          return new Date(a.uploadDate) - new Date(b.uploadDate);
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'size-desc':
          return b.size - a.size;
        case 'size-asc':
          return a.size - b.size;
        default:
          return 0;
      }
    });

    return result;
  }, [files, searchQuery, typeFilter, sortBy]);

  const handleFileUpload = useCallback(async (event) => {
    // Check if it's a drop event or a file input change event
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
              subProjectId: currentSubProject?.id
            });
          };
          reader.readAsDataURL(file);
        });
      });

      const newFiles = await Promise.all(newFilesPromises);

      updateProjects(projects => {
        if (!Array.isArray(projects)) return projects;

        return projects.map(p => {
          if (p.id !== currentProject?.id) return p;
          return {
            ...p,
            subProjects: p.subProjects.map(sp => {
              if (sp.id !== currentSubProject?.id) return sp;
              const spBoardData = sp.boardData || {};
              const currentFiles = spBoardData.files?.files || [];
              return {
                ...sp,
                boardData: {
                  ...spBoardData,
                  files: {
                    ...spBoardData.files,
                    files: [...currentFiles, ...newFiles]
                  }
                }
              };
            })
          };
        });
      });
      toast.success(`${newFiles.length} arquivo(s) enviados com sucesso!`);
    } catch (err) {
      console.error('Erro no upload:', err);
      toast.error('Erro ao fazer upload dos arquivos');
    } finally {
      setIsUploading(false);
    }
  }, [currentProject, currentSubProject, updateProjects]);

  const handleDeleteFile = useCallback((fileId) => {
    if (!currentProject || !currentSubProject || !updateProjects) return;

    updateProjects(projects => {
      if (!Array.isArray(projects)) return projects;

      return projects.map(p => {
        if (p.id !== currentProject?.id) return p;
        return {
          ...p,
          subProjects: p.subProjects.map(sp => {
            if (sp.id !== currentSubProject?.id) return sp;
            const spBoardData = sp.boardData || {};
            const currentFiles = spBoardData.files?.files || [];
            return {
              ...sp,
              boardData: {
                ...spBoardData,
                files: {
                  ...spBoardData.files,
                  files: currentFiles.filter(f => f.id !== fileId)
                }
              }
            };
          })
        };
      });
    });
    toast.success('Arquivo excluído com sucesso');
  }, [currentProject, currentSubProject, updateProjects]);

  return {
    files,
    filteredFiles,
    handleFileUpload,
    isDragging,
    setIsDragging,
    handleDeleteFile,
    isUploading,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    sortBy,
    setSortBy
  };
}
