import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRealtime } from '../hooks/useRealtime';
import LegacyBoard from '../components/legacy/LegacyBoard';
import { Loader2 } from 'lucide-react';

// Utility functions for list filtering
const getKanbanLists = (lists) => lists.filter(l => !l.type || l.type === 'KANBAN');
const getTodoLists = (lists) => lists.filter(l => l.type === 'TODO');
const transformToLegacyData = (lists) => ({
    kanban: { lists: getKanbanLists(lists) },
    todo: { lists: getTodoLists(lists) }
});

export default function BoardPage() {
    const { projectId, areaId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [boardType, setBoardType] = useState('kanban'); // Default
    const [isLoading, setIsLoading] = useState(true);

    // TODO: Fetch Project as well for context if needed by legacy hooks
    const [projectContext, setProjectContext] = useState(null);

    // Function to fetch subproject data
    const fetchBoardData = useCallback(async () => {
        try {
            const res = await fetch(`/api/v2/subprojects/${areaId}`);
            const subData = await res.json();

            // Transform SubData Lists into Legacy Structure
            const legacyData = transformToLegacyData(subData.lists);

            setData({
                ...subData,
                boardData: legacyData
            });

            return subData;
        } catch (err) {
            console.error("Failed to load board", err);
        }
    }, [areaId]);

    // Listen for realtime events from Mason actions
    useRealtime('brickflow:task:created', useCallback((payload) => {
        console.log('[BoardPage] 📡 Tarefa criada via Mason:', payload);
        fetchBoardData();
    }, [fetchBoardData]));

    useRealtime('brickflow:task:completed', useCallback((payload) => {
        console.log('[BoardPage] 📡 Tarefa completada:', payload);
        fetchBoardData();
    }, [fetchBoardData]));

    useRealtime('brickflow:task:deleted', useCallback((payload) => {
        console.log('[BoardPage] 📡 Tarefa deletada:', payload);
        fetchBoardData();
    }, [fetchBoardData]));

    useRealtime('brickflow:subproject:updated', useCallback((payload) => {
        if (payload.id === areaId) {
            console.log('[BoardPage] 📡 Subprojeto atualizado:', payload);
            fetchBoardData();
        }
    }, [areaId, fetchBoardData]));

    useEffect(() => {
        Promise.all([
            fetch(`/api/v2/projects/${projectId}`).then(res => res.json()),
            fetchBoardData()
        ]).then(([projData, subData]) => {
            setProjectContext(projData);

            // Set initial board type based on enabled tabs if available
            if (subData?.board_config?.enabledTabs?.length > 0) {
                setBoardType(subData.board_config.enabledTabs[0]);
            }

            setIsLoading(false);
        }).catch(err => {
            console.error("Failed to load board", err);
            setIsLoading(false);
        });
    }, [projectId, fetchBoardData]);

    // Hook scaffolding (LegacyBoard needs these props)
    // In a real refactor, these hooks would be moved inside LegacyBoard or rewritten
    // For now passing dummies or basic implementations to make it render
    // Task Actions
    const handleTaskAction = async (action, payload) => {
        console.log('Task Action:', action, payload);

        if (action === 'move') {
            const { taskId, toListId, newIndex } = payload;

            // Optimistic Update can be tricky without deep cloning state logic
            // For now we will rely on fast refresh

            try {
                await fetch(`/api/v2/tasks/${taskId}/move`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ toListId, newIndex })
                });

                // Refetch to sync state
                const res = await fetch(`/api/v2/subprojects/${areaId}`);
                const subData = await res.json();

                // Re-transform data
                setData({ ...subData, boardData: transformToLegacyData(subData.lists) });

            } catch (err) {
                console.error("Failed to move task", err);
            }
        } else if (action === 'create') {
            // Implement Create Task
            const { listId, title, description } = payload;
            try {
                await fetch('/api/v2/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ listId, title, description })
                });

                // Refetch
                const res = await fetch(`/api/v2/subprojects/${areaId}`);
                const subData = await res.json();
                setData({ ...subData, boardData: transformToLegacyData(subData.lists) });
            } catch (err) {
                console.error("Failed to create task", err);
            }
        }
    };

    if (isLoading || !data) {
        return (
            <div className="flex-1 flex items-center justify-center p-20">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    // Extract raw board data for the current view
    const currentBoardData = data.boardData[boardType] || { lists: [] };

    return (
        <LegacyBoard
            data={currentBoardData}
            entityName={data.name}
            enabledTabs={data.board_config?.enabledTabs || ['kanban']}
            currentBoardType={boardType}
            setCurrentBoardType={setBoardType}
            currentSubProject={data}
            currentProject={projectContext}
            setCurrentView={(view) => {
                if (view === 'project') {
                    navigate(`/project/${projectId}`);
                } else if (view === 'home') {
                    navigate('/');
                }
            }}
            setModalState={() => { }}
            handleTaskAction={handleTaskAction}
            handleDragStart={() => { }}
            handleDragOver={() => { }}
            handleDrop={() => { }}
            handleDragEnter={() => { }}
            dragOverTargetId={null}
            files={[]}
            filteredFiles={[]}
            searchQuery={''}
            setSearchQuery={() => { }}
            typeFilter={'all'}
            setTypeFilter={() => { }}
            sortBy={'date'}
            setSortBy={() => { }}
            handleFileUploadWithFeedback={() => { }}
            isUploading={false}
            isFileDragging={false}
            setIsFileDragging={() => { }}
            handleDeleteFile={() => { }}
            handleMoveFile={() => { }}
            folders={[]}
            filteredFolders={[]}
            currentFolderId={null}
            currentFolder={null}
            currentFolderPath={[]}
            navigateToFolder={() => { }}
            navigateUp={() => { }}
            handleCreateFolder={() => { }}
            handleRenameFolder={() => { }}
            handleDeleteFolder={() => { }}
            handleChangeFolderColor={() => { }}
        />
    );
}
