import React, { useMemo, useState } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    horizontalListSortingStrategy,
    sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import SortableColumn from './SortableColumn';
import SortableTask from './SortableTask';
import { createPortal } from 'react-dom';
import { Loader2, Plus } from 'lucide-react';

export default function BoardView({
    boardData,
    onTaskMove,
    onColumnReorder,
    onTaskClick,
    onAddTask,
    isLoading
}) {
    const lists = useMemo(() => boardData?.lists || [], [boardData]);
    const listIds = useMemo(() => lists.map(l => l.id), [lists]);

    const [activeColumn, setActiveColumn] = useState(null);
    const [activeTask, setActiveTask] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event) => {
        const { active } = event;
        if (active.data.current?.type === 'Column') {
            setActiveColumn(active.data.current.column);
            return;
        }
        if (active.data.current?.type === 'Task') {
            setActiveTask(active.data.current.task);
            return;
        }
    };

    const handleDragEnd = (event) => {
        setActiveColumn(null);
        setActiveTask(null);

        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const isActiveColumn = active.data.current?.type === 'Column';
        if (isActiveColumn) {
            // Feature: Column Reordering (Future)
            return;
        }

        const isActiveTask = active.data.current?.type === 'Task';
        if (isActiveTask) {
            const activeTask = active.data.current.task;
            const sourceListId = activeTask.list_id;

            let destListId = null;

            // Determine Destination List
            if (over.data.current?.type === 'Column') {
                destListId = over.data.current.column.id;
            } else if (over.data.current?.type === 'Task') {
                destListId = over.data.current.task.list_id;
            }

            if (!destListId) return;

            // Get Current Arrays
            const sourceList = lists.find(l => l.id === sourceListId);
            const destList = lists.find(l => l.id === destListId);

            if (!sourceList || !destList) return;

            let sourceTasks = [...(sourceList.tasks || sourceList.cards || [])];
            let destTasks = [...(destList.tasks || destList.cards || [])];

            // If same list, simple reorder
            if (sourceListId === destListId) {
                const oldIndex = sourceTasks.findIndex(t => t.id === activeId);
                const newIndex = over.data.current?.type === 'Column'
                    ? sourceTasks.length
                    : sourceTasks.findIndex(t => t.id === overId); // Find index of task we dropped over

                if (oldIndex !== -1 && newIndex !== -1) {
                    const newOrder = arrayMove(sourceTasks, oldIndex, newIndex);
                    if (onTaskMove) onTaskMove(sourceListId, newOrder.map(t => t.id));
                }
            }
            // If different list, move
            else {
                const oldIndex = sourceTasks.findIndex(t => t.id === activeId);
                if (oldIndex === -1) return;

                // Remove from source
                const [movedTask] = sourceTasks.splice(oldIndex, 1);

                // Add to Dest
                const newIndex = over.data.current?.type === 'Column'
                    ? destTasks.length
                    : destTasks.findIndex(t => t.id === overId);

                destTasks.splice(newIndex >= 0 ? newIndex : destTasks.length, 0, { ...movedTask, list_id: destListId });

                // Update BOTH lists
                if (onTaskMove) {
                    onTaskMove(sourceListId, sourceTasks.map(t => t.id), destListId, destTasks.map(t => t.id));
                }
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        )
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full overflow-x-auto pb-4 gap-4 px-4 snap-x">
                <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
                    {lists.map(list => (
                        <SortableColumn
                            key={list.id}
                            column={list}
                            tasks={list.cards || list.tasks || []}
                            onAddTask={onAddTask}
                            onTaskClick={onTaskClick}
                        />
                    ))}
                    {/* New List Button Column */}
                    <div className="flex flex-col w-72 shrink-0 h-full max-h-full rounded-xl overflow-hidden glass-panel-premium mx-1 items-center justify-center opacity-70 hover:opacity-100 transition-opacity">
                        <button
                            className="flex flex-col items-center gap-4 group"
                            onClick={() => onAddTask && onAddTask('NEW_LIST')} // Using 'NEW_LIST' as signal
                        >
                            <div className="w-16 h-16 rounded-full border-2 border-dashed border-zinc-700 flex items-center justify-center group-hover:border-zinc-400 transition-colors">
                                <Plus className="w-8 h-8 text-zinc-700 group-hover:text-zinc-400" />
                            </div>
                            <span className="brick-mono text-xs font-bold uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400">Nova Lista</span>
                        </button>
                    </div>
                </SortableContext>
            </div>

            {createPortal(
                <DragOverlay>
                    {activeColumn && (
                        <SortableColumn
                            column={activeColumn}
                            tasks={activeColumn.cards || activeColumn.tasks || []}
                            onAddTask={() => { }}
                            onTaskClick={() => { }}
                        />
                    )}
                    {activeTask && (
                        <SortableTask task={activeTask} />
                    )}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
}
