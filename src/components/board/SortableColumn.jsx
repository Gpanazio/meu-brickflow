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
            className="flex flex-col w-72 shrink-0 h-full max-h-full rounded-xl overflow-hidden glass-panel-premium mx-1 first:ml-0"
        >
            {/* Column Header */}
            <div
                className="flex items-center justify-between p-3 border-b border-white/5 bg-white/5 cursor-grab active:cursor-grabbing"
                {...attributes}
                {...listeners}
            >
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${column.title === 'To Do' ? 'bg-zinc-500' : column.title === 'In Progress' ? 'bg-blue-500' : column.title === 'Done' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-300 font-brick-title">
                        {column.title}
                    </h3>
                    <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-black/20 text-[9px] text-zinc-500 font-mono">
                        {tasks.length}
                    </span>
                </div>
                <button className="text-zinc-600 hover:text-white transition-colors p-1 hover:bg-white/5 rounded">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Column Body (Droppable) */}
            <div className="flex-1 overflow-hidden p-2 bg-black/20">
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                    <ScrollArea className="h-full pr-2">
                        <div className="flex flex-col gap-2 min-h-[100px] pb-2">
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
                className="flex items-center justify-center gap-2 p-3 text-zinc-500 hover:text-white hover:bg-white/5 transition-all text-[10px] font-bold uppercase tracking-widest border-t border-white/5 group"
            >
                <div className="w-4 h-4 rounded-full border border-zinc-700 flex items-center justify-center group-hover:border-white group-hover:bg-white group-hover:text-black transition-all">
                    <Plus className="w-2.5 h-2.5" />
                </div>
                Adicionar Tarefa
            </button>
        </div>
    );
}
