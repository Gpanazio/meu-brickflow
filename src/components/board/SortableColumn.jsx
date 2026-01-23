import React, { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableTask from './SortableTask';
import { MoreHorizontal, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SortableColumn({ column, tasks, onAddTask, onTaskClick }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: column.id,
        data: {
            type: 'Column',
            column
        }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const taskIds = useMemo(() => tasks.map(t => t.id), [tasks]);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex flex-col w-80 shrink-0 h-full max-h-full bg-black/20 border-r border-white/5 last:border-r-0"
        >
            {/* Column Header */}
            <div
                className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-950/30 backdrop-blur-sm cursor-grab active:cursor-grabbing"
                {...attributes}
                {...listeners}
            >
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-800" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                        {column.title}
                    </h3>
                    <span className="text-[10px] text-zinc-600 font-mono">
                        {tasks.length}
                    </span>
                </div>
                <button className="text-zinc-600 hover:text-white transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                </button>
            </div>

            {/* Column Body (Droppable) */}
            <div className="flex-1 overflow-hidden p-3 bg-zinc-950/10">
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                    <ScrollArea className="h-full pr-3">
                        <div className="flex flex-col gap-2 min-h-[100px]">
                            {tasks.map(task => (
                                <SortableTask
                                    key={task.id}
                                    task={task}
                                    onClick={(e) => {
                                        e.stopPropagation(); // prevent drag start if clicking interactive elements
                                        onTaskClick(task);
                                    }}
                                />
                            ))}
                        </div>
                    </ScrollArea>
                </SortableContext>
            </div>

            {/* Footer / Add Task */}
            <button
                onClick={() => onAddTask(column.id)}
                className="flex items-center gap-2 p-3 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all text-xs font-medium uppercase tracking-wider border-t border-white/5"
            >
                <Plus className="w-4 h-4" />
                Adicionar
            </button>
        </div>
    );
}
