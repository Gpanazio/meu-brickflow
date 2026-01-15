import { useMemo, useState, useCallback } from 'react';
import { generateId } from '../utils/ids';
import { toast } from 'sonner';

const MAX_SIZE_BYTES = 50 * 1024 * 1024;

export function useFiles(currentProject, currentSubProject, updateProjects) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const files = useMemo(() => {
    const rawFiles = currentSubProject?.boardData?.files?.files;
    return Array.isArray(rawFiles) ? rawFiles : [];
  }, [currentSubProject]);

  const handleFileUpload = useCallback(async (event) => {
    const uploadedFiles = Array.from(event.target?.files || event.dataTransfer?.files || []);
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

      updateProjects(prev => {
        if (!prev || !prev.projects) return prev;
        const project = prev.projects.find(p => p.id === currentProject?.id);
        if (!project) return prev;

        const subProject = project.subProjects.find(sp => sp.id === currentSubProject?.id);
        if (!subProject) return prev;

        const spBoardData = subProject.boardData || {};
        const currentFiles = spBoardData.files?.files || [];
        return {
          ...prev,
          projects: prev.projects.map(p => {
            if (p.id !== currentProject?.id) return p;
            return {
              ...p,
              subProjects: p.subProjects.map(sp => {
                if (sp.id !== currentSubProject?.id) return sp;
                const spBoardData2 = sp.boardData || {};
                return {
                  ...sp,
                  boardData: {
                    ...spBoardData2,
                    files: {
                      ...spBoardData2.files,
                      files: [...currentFiles, ...newFiles]
                    }
                  }
                };
              })
            };
          })
        };
      });
    } catch (err) {
      console.error('Erro no upload:', err);
    } finally {
      setIsUploading(false);
    }
  }, [currentProject, currentSubProject, updateProjects]);

  const handleDeleteFile = useCallback((fileId) => {
    if (!currentProject || !currentSubProject || !updateProjects) return;

    updateProjects(prev => {
      if (!prev || !prev.projects) return prev;
      const project = prev.projects.find(p => p.id === currentProject?.id);
      if (!project) return prev;

      return {
        ...prev,
        projects: prev.projects.map(p => {
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
        })
      };
    });
  }, [currentProject, currentSubProject, updateProjects]);

  return { files, handleFileUpload, isDragging, setIsDragging, handleDeleteFile, isUploading };
}
