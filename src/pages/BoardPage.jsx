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

    // ... (fetchBoardData and useRealtime hooks remain same)

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
                const { id, isArchived } = payload;
                // Assuming update endpoint handles archive toggle
                await fetch(`/api/v2/tasks/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isArchived })
                });
            } else if (action === 'addColumn') {
                // Implement Add Column logic if needed (POST /lists)
                // For now just log
                console.log('Add Column not implemented yet');
            } else if (action === 'deleteColumn') {
                // Implement Delete Column logic if needed (DELETE /lists/:id)
                console.log('Delete Column not implemented yet');
            } else if (action === 'updateColumn') {
                // Implement Update Column (PUT /lists/:id)
                const { listId, updates } = payload;
                // await fetch(...)
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
    const currentBoardData = data.boardData[boardType] || { lists: [] };

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
