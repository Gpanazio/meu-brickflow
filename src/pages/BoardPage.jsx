import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRealtime } from '../hooks/useRealtime';
import LegacyBoard from '../components/legacy/LegacyBoard';
import { Loader2 } from 'lucide-react';

// Utility functions for list filtering
const getKanbanLists = (lists) => lists.filter(l => !l.type || l.type === 'KANBAN');
const getTodoLists = (lists) => lists.filter(l => l.type === 'TODO');
const getGoalLists = (lists) => lists.filter(l => l.type === 'GOALS');

const transformToLegacyData = (lists) => {
    // Normalize lists: map 'cards' to 'tasks' if tasks is missing
    const normalizedLists = lists.map(list => ({
        ...list,
        tasks: list.tasks || list.cards || []
    }));

    return {
        kanban: { lists: getKanbanLists(normalizedLists) },
        todo: { lists: getTodoLists(normalizedLists) },
        goals: { lists: getGoalLists(normalizedLists) }
    };
};

import { Dialog } from '@/components/ui/dialog';
import TaskModal from '@/components/modals/TaskModal';

// ... (previous imports)

export default function BoardPage() {
    const { projectId, areaId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [boardType, setBoardType] = useState('kanban'); // Default
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [modalState, setModalState] = useState({
        isOpen: false,
        type: null,
        mode: null,
        data: null
    });

    // TODO: Fetch Project as well for context if needed by legacy hooks
    const [projectContext, setProjectContext] = useState(null);

    // Fetch Board Data
    const fetchBoardData = useCallback(async () => {
        if (!areaId) return;

        try {
            const res = await fetch(`/api/v2/subprojects/${areaId}`);
            if (!res.ok) throw new Error('Failed to fetch subproject');

            const subProjectData = await res.json();

            // Transform lists into legacy board structure
            const boardData = transformToLegacyData(subProjectData.lists || []);

            // Merge with existing boardData from API (files, folders, etc.)
            const mergedBoardData = {
                ...boardData,
                ...(subProjectData.boardData || {}),
                files: subProjectData.boardData?.files || { files: [], folders: [] }
            };

            setData({
                ...subProjectData,
                boardData: mergedBoardData
            });

            // Optionally fetch project context
            if (projectId) {
                try {
                    const projRes = await fetch(`/api/v2/projects/${projectId}`);
                    if (projRes.ok) {
                        const projData = await projRes.json();
                        setProjectContext(projData);
                    }
                } catch (err) {
                    console.warn('Failed to fetch project context:', err);
                }
            }

            // Set default board type based on enabled tabs
            const enabledTabs = subProjectData.board_config?.enabledTabs || ['kanban'];
            if (enabledTabs.length > 0 && !enabledTabs.includes(boardType)) {
                setBoardType(enabledTabs[0]);
            }

        } catch (err) {
            console.error('Failed to load board data:', err);
        }
    }, [areaId, projectId, boardType]);

    // Initial Load
    useEffect(() => {
        fetchBoardData().finally(() => setIsLoading(false));
    }, [fetchBoardData]);

    // Realtime Sync Listeners
    useRealtime('brickflow:task:created', useCallback((payload) => {
        console.log('[BoardPage] 📡 Task created:', payload);
        fetchBoardData();
    }, [fetchBoardData]));

    useRealtime('brickflow:task:updated', useCallback((payload) => {
        console.log('[BoardPage] 📡 Task updated:', payload);
        fetchBoardData();
    }, [fetchBoardData]));

    useRealtime('brickflow:task:deleted', useCallback((payload) => {
        console.log('[BoardPage] 📡 Task deleted:', payload);
        fetchBoardData();
    }, [fetchBoardData]));

    // Task Actions
    const handleTaskAction = async (action, payload) => {
        console.log('Task Action:', action, payload);

        try {
            if (action === 'move') {
                const { taskId, toListId, newIndex } = payload;
                await fetch(`/api/v2/tasks/${taskId}/move`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ toListId, newIndex })
                });
            } else if (action === 'create' || (action === 'save' && !payload.id)) {
                // Create Task
                const { listId, title, description, responsibleUsers, priority, endDate, checklists, labels } = payload;
                await fetch('/api/v2/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        listId,
                        title,
                        description,
                        responsibleUsers,
                        priority,
                        endDate,
                        checklists,
                        labels
                    })
                });
            } else if (action === 'save' && payload.id) {
                // Update Task
                const { id, title, description, responsibleUsers, priority, endDate, checklists, labels, isArchived } = payload;
                await fetch(`/api/v2/tasks/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title,
                        description,
                        responsibleUsers,
                        priority,
                        endDate,
                        checklists,
                        labels,
                        isArchived
                    })
                });
            } else if (action === 'delete') {
                const { taskId } = payload;
                await fetch(`/api/v2/tasks/${taskId}`, {
                    method: 'DELETE'
                });
            } else if (action === 'archive') {
                const { isArchived } = payload;
                await fetch(`/api/v2/tasks/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isArchived })
                });
            } else if (action === 'addTab') {
                const { title, type } = payload;
                // Fetch current config first to be safe
                // OR use local data if careful
                const currentConfig = data.board_config || {};
                let currentTabs = Array.isArray(currentConfig.enabledTabs) ?
                    (typeof currentConfig.enabledTabs[0] === 'string' ?
                        currentConfig.enabledTabs.map(t => ({ id: t, title: t, type: t })) :
                        currentConfig.enabledTabs)
                    : [];

                // Normalize legacy defaults if empty
                if (currentTabs.length === 0) currentTabs = [{ id: 'kanban', title: 'Kanban', type: 'kanban' }, { id: 'files', title: 'Arquivos', type: 'files' }];

                if (currentTabs.length >= 10) {
                    alert("Limite de 10 abas atingido.");
                    return;
                }

                const newTabId = 'tab-' + Date.now();
                const newTab = {
                    id: newTabId,
                    title: title,
                    type: type || 'kanban' // Default to Kanban
                };

                const newTabs = [...currentTabs, newTab];

                // We need to persist this. Subproject update.
                await fetch(`/api/v2/subprojects/${data.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        enabledTabs: newTabs // Sending objects now, backend needs to handle or store as JSON
                    })
                });

                // Also create default lists for this tab?
                // POST /lists for default columns
                const defaultLists = ['To Do', 'Doing', 'Done'];
                for (const listTitle of defaultLists) {
                    await fetch('/api/v2/lists', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            subProjectId: data.id,
                            title: listTitle,
                            type: 'KANBAN',
                            tabId: newTabId
                        })
                    });
                }

            } else if (action === 'addColumn') {
                const { title } = payload;
                await fetch('/api/v2/lists', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        subProjectId: data.id,
                        title,
                        type: 'KANBAN', // Default to Kanban type lists
                        tabId: boardType // Associate with current tab
                    })
                });
            } else if (action === 'deleteColumn') {
                const { listId } = payload;
                await fetch(`/api/v2/lists/${listId}`, {
                    method: 'DELETE'
                });
            } else if (action === 'updateColumn') {
                const { listId, updates } = payload;
                if (updates.title) {
                    await fetch(`/api/v2/lists/${listId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: updates.title })
                    });
                }
            }

            // Always refetch to sync state (simplest for now)
            // Ideally we should use optimistic updates or return data from API to update local state
            fetchBoardData();

        } catch (err) {
            console.error(`Failed to execute action ${action}`, err);
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
    // Filter lists by the current boardType (which aligns with tab_id)
    const currentLists = (data.lists || []).filter(l => {
        // Legacy fallback: if no tab_id, map 'KANBAN' type to 'kanban' tab
        const tabId = l.tab_id || (l.type === 'KANBAN' ? 'kanban' : (l.type === 'TODO' ? 'todo' : 'goals'));
        return tabId === boardType;
    });

    const currentBoardData = {
        lists: currentLists,
        // Keep other properties if needed
        ...data.boardData[boardType]
    };

    return (
        <>
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
                setModalState={setModalState}
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

            <Dialog open={modalState.isOpen} onOpenChange={(open) => setModalState(prev => ({ ...prev, isOpen: open }))}>
                {modalState.type === 'task' && (
                    <TaskModal
                        modalState={modalState}
                        setModalState={setModalState}
                        handleTaskAction={handleTaskAction}
                        currentUser={{ username: 'Eu', id: 'me' }} // Mock user for now
                        isReadOnly={false}
                    />
                )}
            </Dialog>
        </>
    );
}
