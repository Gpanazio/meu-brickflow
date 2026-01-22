import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRealtime } from '../hooks/useRealtime';
import LegacyProjectView from '../components/legacy/LegacyProjectView';
import { Loader2 } from 'lucide-react';
import { COLOR_VARIANTS } from '@/constants/theme';

export default function ProjectPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

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

    if (isLoading || !project) {
        return (
            <div className="flex-1 flex items-center justify-center p-20">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    return (
        <LegacyProjectView
            currentProject={project}
            setCurrentView={() => { }} // Legacy prop
            setModalState={() => { }} // TODO
            COLOR_VARIANTS={COLOR_VARIANTS}
            handleAccessProject={(subProject) => {
                // Navigate to Board Page
                navigate(`/project/${projectId}/area/${subProject.id}`);
            }}
            handleDeleteProject={() => { }}
            handleDragStart={() => { }}
            handleDragOver={() => { }}
            handleDrop={() => { }}
            history={[]}
            isHistoryLoading={false}
            historyError={null}
        />
    );
}

