import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LegacyProjectView from '../components/legacy/LegacyProjectView';
import { Loader2 } from 'lucide-react';
import { COLOR_VARIANTS } from '@/constants/theme';

export default function ProjectPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/v2/projects/${projectId}`)
            .then(res => res.json())
            .then(data => {
                setProject(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to load project", err);
                setIsLoading(false);
            });
    }, [projectId]);

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
