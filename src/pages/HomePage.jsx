import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useUsers } from '../hooks/useUsers';
import { useNavigate } from 'react-router-dom';
import { useRealtime } from '../hooks/useRealtime';
import HomeView from '../pages/HomeView';
import CreateProjectModal from '../components/CreateProjectModal';
import { absurdPhrases } from '@/utils/phrases';
import { Loader2 } from 'lucide-react';
import { COLOR_VARIANTS } from '@/constants/theme';

export default function HomePage() {
    const { currentUser } = useUsers();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dailyPhrase, setDailyPhrase] = useState('');
    const [megaSena, setMegaSena] = useState([]);
    const [modalState, setModalState] = useState({ isOpen: false, mode: 'create', data: null });

    // Function to fetch projects
    const fetchProjects = useCallback(async () => {
        try {
            const res = await fetch('/api/v2/projects');
            const data = await res.json();
            setProjects(data);
        } catch (err) {
            console.error("Failed to load projects", err);
        }
    }, []);

    // Listen for realtime events from Mason actions
    useRealtime('brickflow:project:created', useCallback((payload) => {
        console.log('[HomePage] 📡 Projeto criado via Mason:', payload);
        fetchProjects(); // Refetch projects list
    }, [fetchProjects]));

    useRealtime('brickflow:project:deleted', useCallback((payload) => {
        console.log('[HomePage] 📡 Projeto deletado via Mason:', payload);
        setProjects(prev => prev.filter(p => p.id !== payload.id));
    }, []));

    useRealtime('brickflow:project:updated', useCallback((payload) => {
        console.log('[HomePage] 📡 Projeto atualizado:', payload);
        fetchProjects();
    }, [fetchProjects]));

    useEffect(() => {
        // Random elements
        setDailyPhrase(absurdPhrases[Math.floor(Math.random() * absurdPhrases.length)]);
        const numbers = [];
        while (numbers.length < 6) {
            const num = Math.floor(Math.random() * 60) + 1;
            if (!numbers.includes(num)) numbers.push(num);
        }
        setMegaSena(numbers.sort((a, b) => a - b));

        // Fetch Projects V2
        fetchProjects().finally(() => setIsLoading(false));
    }, [fetchProjects]);

    const handleAccessProject = (project) => {
        navigate(`/project/${project.id}`);
    };

    const handleCreateProject = async (projectData) => {
        try {
            const res = await fetch('/api/v2/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectData)
            });
            if (res.ok) {
                const newProject = await res.json();
                setProjects(prev => [newProject, ...prev]);
                toast.success('Projeto criado com sucesso!');
            } else {
                const err = await res.json();
                toast.error(`Erro ao criar projeto: ${err.error || 'Erro desconhecido'}`);
            }
        } catch (error) {
            console.error('Create project error:', error);
            toast.error('Erro de conexão ao tentar criar o projeto.');
        }
    };

    const handleUpdateProject = async (projectData) => {
        try {
            const res = await fetch(`/api/v2/projects/${modalState.data.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectData)
            });
            if (res.ok) {
                fetchProjects(); // Refresh the list
                toast.success('Projeto atualizado!');
            } else {
                const err = await res.json();
                toast.error(`Erro ao atualizar projeto: ${err.error || 'Erro desconhecido'}`);
            }
        } catch (error) {
            console.error('Update project error:', error);
            toast.error('Erro de conexão ao tentar atualizar o projeto.');
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center p-20">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    return (
        <>
            <HomeView
                currentUser={currentUser}
                dailyPhrase={dailyPhrase}
                megaSenaNumbers={megaSena}
                projects={projects}
                setModalState={setModalState}
                handleAccessProject={handleAccessProject}
                handleDeleteProject={async (project) => {
                    if (!window.confirm(`Tem certeza que deseja excluir o projeto "${project.name}"? Esta ação não pode ser desfeita.`)) return;

                    try {
                        const res = await fetch(`/api/v2/projects/${project.id}`, { method: 'DELETE' });
                        if (res.ok) {
                            setProjects(prev => prev.filter(p => p.id !== project.id));
                            toast.success('Projeto excluído.');
                        } else {
                            const err = await res.json();
                            toast.error(`Erro ao excluir: ${err.error || 'Erro desconhecido'}`);
                        }
                    } catch (error) {
                        console.error('Delete error:', error);
                        toast.error('Erro de conexão ao tentar excluir o projeto.');
                    }
                }}
                onTaskClick={(task) => {
                    // Navigate to project/subproject with taskId param
                    if (task.projectId && task.subProjectId) {
                        navigate(`/project/${task.projectId}/area/${task.subProjectId}?taskId=${task.id}`);
                    } else {
                        console.warn("Task missing project/subproject context", task);
                    }
                }}
                isLoading={isLoading}
                onProjectReorder={async (activeId, overId) => {
                    const oldIndex = projects.findIndex(p => p.id === activeId);
                    const newIndex = projects.findIndex(p => p.id === overId);

                    // Optimistic UI Update
                    const newProjects = [...projects];
                    const [movedProject] = newProjects.splice(oldIndex, 1);
                    newProjects.splice(newIndex, 0, movedProject);
                    setProjects(newProjects);

                    // API Call (Debounced ideal, but direct for now)
                    try {
                        await fetch('/api/v2/projects/reorder', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ projectIds: newProjects.map(p => p.id) })
                        });
                    } catch (err) {
                        console.error("Failed to reorder projects", err);
                        // Revert on error?
                        fetchProjects();
                    }
                }}
            />
            <CreateProjectModal
                isOpen={modalState.isOpen}
                mode={modalState.mode}
                initialData={modalState.data}
                onClose={() => setModalState({ isOpen: false, mode: 'create', data: null })}
                onCreate={modalState.mode === 'edit' ? handleUpdateProject : handleCreateProject}
            />
        </>
    );
}

