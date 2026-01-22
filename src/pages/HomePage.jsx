import React, { useEffect, useState, useCallback } from 'react';
import { useUsers } from '../hooks/useUsers';
import { useNavigate } from 'react-router-dom';
import { useRealtime } from '../hooks/useRealtime';
import LegacyHome from '../components/legacy/LegacyHome';
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

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center p-20">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    return (
        <LegacyHome
            currentUser={currentUser}
            dailyPhrase={dailyPhrase}
            megaSenaNumbers={megaSena}
            projects={projects}
            setModalState={() => { }} // TODO: Implement Modals Context
            handleAccessProject={handleAccessProject}
            handleDeleteProject={async (project) => {
                if (!window.confirm(`Tem certeza que deseja excluir o projeto "${project.name}"? Esta ação não pode ser desfeita.`)) return;

                try {
                    const res = await fetch(`/api/v2/projects/${project.id}`, { method: 'DELETE' });
                    if (res.ok) {
                        setProjects(prev => prev.filter(p => p.id !== project.id));
                        // Assuming Toaster is available globally or log it
                        console.log('Project deleted');
                    } else {
                        const err = await res.json();
                        alert(`Erro ao excluir: ${err.error || 'Erro desconhecido'}`);
                    }
                } catch (error) {
                    console.error('Delete error:', error);
                    alert('Erro de conexão ao tentar excluir o projeto.');
                }
            }}
            isLoading={isLoading}
            COLOR_VARIANTS={COLOR_VARIANTS}
            handleDragStart={() => { }}
            handleDragOver={() => { }}
            handleDrop={() => { }}
        />
    );
}

