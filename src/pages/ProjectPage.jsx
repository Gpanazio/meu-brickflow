import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRealtime } from '../hooks/useRealtime';
import LegacyProjectView from '../components/legacy/LegacyProjectView';
import { CreateSubProjectModal } from '../components/CreateSubProjectModal';
import { Loader2 } from 'lucide-react';
import { COLOR_VARIANTS } from '@/constants/theme';

export default function ProjectPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [modalState, setModalState] = useState({ isOpen: false, mode: 'create', type: null, data: null });

    // Function to fetch project data
    const fetchProject = useCallback(async () => {
        try {
            const res = await fetch(`/api/v2/projects/${projectId}`);
            const data = await res.json();
            setProject(data);
        } catch (err) {
            console.error("Failed to load project", err);
        }
    }, [projectId]);

    // Listen for realtime events from Mason actions
    useRealtime('brickflow:subproject:created', useCallback((payload) => {
        // Only refetch if the subproject belongs to this project
        if (payload.projectId === projectId) {
            console.log('[ProjectPage] 📡 Subprojeto criado via Mason:', payload);
            fetchProject();
        }
    }, [projectId, fetchProject]));

    useRealtime('brickflow:subproject:updated', useCallback((payload) => {
        if (payload.projectId === projectId) {
            console.log('[ProjectPage] 📡 Subprojeto atualizado:', payload);
            fetchProject();
        }
    }, [projectId, fetchProject]));

    useRealtime('brickflow:task:created', useCallback((payload) => {
        // Tasks are nested in subprojects, refetch to update counts/state
        console.log('[ProjectPage] 📡 Tarefa criada via Mason:', payload);
        fetchProject();
    }, [fetchProject]));

    useRealtime('brickflow:project:updated', useCallback((payload) => {
        if (payload.id === projectId) {
            console.log('[ProjectPage] 📡 Projeto atualizado:', payload);
            fetchProject();
        }
    }, [projectId, fetchProject]));

    useEffect(() => {
        fetchProject().finally(() => setIsLoading(false));
    }, [fetchProject]);

    // Handle create subproject
    const handleCreateSubProject = async (subProjectData) => {
        try {
            const res = await fetch(`/api/v2/projects/${projectId}/subprojects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subProjectData)
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to create subproject');
            }
            // Refetch project to get updated subprojects
            fetchProject();
        } catch (err) {
            console.error('Failed to create subproject:', err);
        }
    };

    // Handle update subproject
    const handleUpdateSubProject = async (subProjectData) => {
        try {
            const subProjectId = modalState.data?.id;
            if (!subProjectId) return;

            const res = await fetch(`/api/v2/subprojects/${subProjectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subProjectData)
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to update subproject');
            }
            // Refetch project to get updated subprojects
            fetchProject();
        } catch (err) {
            console.error('Failed to update subproject:', err);
        }
    };

    // Handle delete subproject
    const handleDeleteSubProject = async (subProject) => {
        if (!confirm(`Tem certeza que deseja excluir "${subProject.name}"?`)) return;

        try {
            const res = await fetch(`/api/v2/subprojects/${subProject.id}`, {
                method: 'DELETE'
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete subproject');
            }
            // Refetch project to get updated subprojects
            fetchProject();
        } catch (err) {
            console.error('Failed to delete subproject:', err);
        }
    };

    if (isLoading || !project) {
        return (
            <div className="flex-1 flex items-center justify-center p-20">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    // Transform modal data for CreateSubProjectModal
    const getModalInitialData = () => {
        if (!modalState.data) return null;
        const sub = modalState.data;
        // Parse board_config to get enabledTabs
        let enabledTabs = ['kanban', 'files'];
        if (sub.board_config) {
            const config = typeof sub.board_config === 'string' ? JSON.parse(sub.board_config) : sub.board_config;
            enabledTabs = config.enabledTabs || enabledTabs;
        }
        return {
            ...sub,
            enabledTabs
        };
    };

    return (
        <>
            <LegacyProjectView
                currentProject={project}
                setCurrentView={(view) => {
                    if (view === 'home') navigate('/');
                }}
                setModalState={setModalState}
                COLOR_VARIANTS={COLOR_VARIANTS}
                handleAccessProject={(subProject) => {
                    // Navigate to Board Page
                    navigate(`/project/${projectId}/area/${subProject.id}`);
                }}
                handleDeleteProject={(item, isSubProject) => {
                    if (isSubProject) {
                        handleDeleteSubProject(item);
                    }
                }}
                handleDragStart={() => { }}
                handleDragOver={() => { }}
                handleDrop={() => { }}
                history={[]}
                isHistoryLoading={false}
                historyError={null}
            />

            {/* Modal for creating/editing subprojects */}
            <CreateSubProjectModal
                isOpen={modalState.isOpen && modalState.type === 'subProject'}
                mode={modalState.mode}
                initialData={getModalInitialData()}
                onClose={() => setModalState({ isOpen: false, mode: 'create', type: null, data: null })}
                onCreate={modalState.mode === 'edit' ? handleUpdateSubProject : handleCreateSubProject}
            />
        </>
    );
}

