import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRealtime } from '../hooks/useRealtime';
import { Loader2, ArrowLeft, Plus } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import MechButton from '../components/ui/MechButton';
import { Dialog } from '@/components/ui/dialog';
import TaskModal from '@/components/modals/TaskModal';

// Views
import BoardView from '../components/board/BoardView';
import FilesBoard from '../components/boards/FilesBoard';
import GoalsBoard from '../components/boards/GoalsBoard';

// Utility functions for list filtering
const getKanbanLists = (lists) => lists.filter(l => !l.type || l.type === 'KANBAN');
const getTodoLists = (lists) => lists.filter(l => l.type === 'TODO');
const getGoalLists = (lists) => lists.filter(l => l.type === 'GOALS');

const transformToLegacyData = (lists) => {
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

import { useFileFilters } from '../hooks/useFileFilters';

export default function BoardPage() {
    const { projectId, areaId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [boardType, setBoardType] = useState('kanban'); // Default
    const [isLoading, setIsLoading] = useState(true);

    // File Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');

    // Calculate Filtered Files
    const files = useMemo(() => data?.boardData?.files?.files || [], [data]);
    const folders = useMemo(() => data?.boardData?.files?.folders || [], [data]);

    const { filteredFiles, filteredFolders } = useFileFilters(
        files,
        folders,
        searchQuery,
        typeFilter,
        sortBy
    );

    // Modal State
    const [modalState, setModalState] = useState({
        isOpen: false,
        type: null,
        mode: null,
        data: null
    });

    const [projectContext, setProjectContext] = useState(null);

    // Fetch Board Data
    const fetchBoardData = useCallback(async () => {
        if (!areaId) return;

        try {
            const res = await fetch(`/api/v2/subprojects/${areaId}`);
            if (!res.ok) throw new Error('Failed to fetch subproject');

            const subProjectData = await res.json();

            // Transform lists into legacy board structure for compatibility
            const boardData = transformToLegacyData(subProjectData.lists || []);
            const mergedBoardData = {
                ...boardData,
                ...(subProjectData.boardData || {}),
                files: subProjectData.boardData?.files || { files: [], folders: [] }
            };

            setData({
                ...subProjectData,
                boardData: mergedBoardData
            });

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

            // Set default board type
            const enabledTabs = subProjectData.board_config?.enabledTabs || ['kanban'];
            if (enabledTabs.length > 0 && !enabledTabs.includes(boardType)) {
                // Only verify if current is invalid
                // If boardType is 'files' but not enabled, switch?
                // But usually fine to keep user existing preference if valid
                // Checking if logic is needed:
                // if (!enabledTabs.includes(boardType)) setBoardType(enabledTabs[0]);
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
    useRealtime('brickflow:task:created', useCallback(() => fetchBoardData(), [fetchBoardData]));
    useRealtime('brickflow:task:updated', useCallback(() => fetchBoardData(), [fetchBoardData]));
    useRealtime('brickflow:task:deleted', useCallback(() => fetchBoardData(), [fetchBoardData]));
    useRealtime('brickflow:list:updated', useCallback(() => fetchBoardData(), [fetchBoardData])); // Reorder sync

    // Handlers
    const handleTaskMoveBatch = async (sourceListId, newSourceOrder, destListId, newDestOrder) => {
        // Optimistic Update
        const newData = { ...data };
        const allLists = newData.lists || [];

        // Update Source List
        const sourceList = allLists.find(l => l.id === sourceListId);
        if (sourceList) {
            const orderedTasks = newSourceOrder.map(id => sourceList.cards.find(c => c.id === id)).filter(Boolean);
            // We need to fetch tasks that moved OUT? 
            // Actually boardView gives us IDs. We need to reconstruct the array objects from existing data to avoid flicker.
            // But if a task moved source->dest, it's not in source anymore.
            // boardView logic removed it.
            // It's safer if BoardView returns the actual task objects but simpler for API to just send IDs.
            // We rely on fetchBoardData for "truth", so optimistic update here is complex without task objects.
            // BoardView already updated ITS state visually via local prop mutation? No, BoardView relies on props.
            // So we MUST update `data` here.

            // Simpler: Just make the API call and refetch immediately. 
            // Without optimistic update, it might snap back. 
            // Ideally we implement optimistic update properly by moving the task object in `data.lists`.
            // But existing code structure is deep.
        }

        try {
            // Source Reorder
            await fetch(`/api/v2/lists/${sourceListId}/reorder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskIds: newSourceOrder })
            });

            // Dest Reorder (if different)
            if (destListId && destListId !== sourceListId) {
                await fetch(`/api/v2/lists/${destListId}/reorder`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ taskIds: newDestOrder })
                });
            }

            fetchBoardData(); // Sync final state

        } catch (error) {
            console.error("Failed to move tasks:", error);
            fetchBoardData(); // Revert
        }
    };

    const handleTaskAction = async (action, payload) => {
        if (action === 'create' || (action === 'save' && !payload.id)) {
            await fetch('/api/v2/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    listId: payload.listId,
                    title: payload.title,
                    description: payload.description,
                    responsibleUsers: payload.responsibleUsers,
                    priority: payload.priority,
                    endDate: payload.endDate,
                    checklists: payload.checklists,
                    labels: payload.labels
                })
            });
        } else if (action === 'save' && payload.id) {
            await fetch(`/api/v2/tasks/${payload.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else if (action === 'delete') {
            await fetch(`/api/v2/tasks/${payload.taskId}`, { method: 'DELETE' });
        } else if (action === 'addTab') {
            // ... legacy add tab logic ...
            const title = payload.title;
            // Simplified: just alert or basic add
            alert("Adicionar aba via configurações em breve.");
        } else if (action === 'addColumn') {
            await fetch('/api/v2/lists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subProjectId: data.id,
                    title: payload.title,
                    type: 'KANBAN',
                    tabId: boardType
                })
            });
        }

        fetchBoardData();
    };


    if (isLoading || !data) {
        return (
            <div className="flex-1 flex items-center justify-center p-20">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    // Filter lists for current view
    const currentLists = (data.lists || []).filter(l => {
        const tabId = l.tab_id || (l.type === 'KANBAN' ? 'kanban' : (l.type === 'TODO' ? 'todo' : 'goals'));
        return tabId === boardType;
    });

    const currentBoardData = {
        lists: currentLists,
        ...data.boardData[boardType] // Legacy data if any
    };

    // Normalize tabs
    const enabledTabs = data.board_config?.enabledTabs || ['kanban'];
    const normalizedTabs = enabledTabs.map(t => typeof t === 'string' ? { id: t, title: t === 'kanban' ? 'Kanban' : (t === 'todo' ? 'Lista' : (t === 'goals' ? 'Metas' : (t === 'files' ? 'Arquivos' : t))), type: t } : t);

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] relative overflow-hidden bg-black text-white">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-zinc-900 pb-4 gap-4 px-4 pt-4">
                <div className="flex items-center gap-4">
                    <MechButton onClick={() => navigate(`/project/${projectId}`)} className="px-3" icon={ArrowLeft}>
                        Voltar
                    </MechButton>
                    <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight truncate max-w-[200px] md:max-w-none">{data.name}</h2>
                </div>
                <Tabs value={boardType} onValueChange={setBoardType} className="w-full md:w-auto">
                    <TabsList className="bg-transparent border-b border-transparent rounded-none h-8 p-0 gap-4 w-full md:w-auto overflow-x-auto justify-start md:justify-center scrollbar-hide">
                        {normalizedTabs.map(tab => (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className="rounded-none uppercase text-xs font-bold tracking-widest h-full data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b data-[state=active]:border-red-600 text-zinc-600"
                            >
                                {tab.title}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>

            <div className="flex-1 overflow-hidden relative z-10 px-4">
                {/* VIEWS */}
                {boardType === 'files' ? (
                    <FilesBoard
                        files={data.boardData?.files?.files || []}
                        filteredFiles={filteredFiles}
                        folders={data.boardData?.files?.folders || []}
                        filteredFolders={filteredFolders}

                        // State
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        typeFilter={typeFilter}
                        setTypeFilter={setTypeFilter}
                        sortBy={sortBy}
                        setSortBy={setSortBy}

                        // Pass mock handlers for now or reimplement hooks if needed for full file support
                        currentFolderPath={[]}
                    // ... other props ...
                    />
                ) : boardType === 'goals' ? (
                    <GoalsBoard data={data} handleTaskAction={handleTaskAction} setModalState={setModalState} />
                ) : (
                    <BoardView
                        boardData={currentBoardData}
                        onTaskMove={handleTaskMoveBatch}
                        onAddTask={(listId) => setModalState({ isOpen: true, type: 'task', mode: 'create', data: { listId } })}
                        onTaskClick={(task) => setModalState({ isOpen: true, type: 'task', mode: 'edit', data: task })}
                        isLoading={false}
                    />
                )}
            </div>

            <Dialog open={modalState.isOpen} onOpenChange={(open) => setModalState(prev => ({ ...prev, isOpen: open }))}>
                {modalState.type === 'task' && (
                    <TaskModal
                        modalState={modalState}
                        setModalState={setModalState}
                        handleTaskAction={handleTaskAction}
                        currentUser={{ username: 'Eu', id: 'me' }}
                        isReadOnly={false}
                    />
                )}
            </Dialog>
        </div>
    );
}
