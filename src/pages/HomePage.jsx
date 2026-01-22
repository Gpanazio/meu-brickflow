import React, { useEffect, useState } from 'react';
import { useUsers } from '../hooks/useUsers';
import { useNavigate } from 'react-router-dom';
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
        fetch('/api/v2/projects')
            .then(res => res.json())
            .then(data => {
                setProjects(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to load projects", err);
                setIsLoading(false);
            });
    }, []);

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
            handleDeleteProject={() => { }} // TODO: Implement Delete
            isLoading={isLoading}
            COLOR_VARIANTS={COLOR_VARIANTS}
            handleDragStart={() => { }}
            handleDragOver={() => { }}
            handleDrop={() => { }}
        />
    );
}
