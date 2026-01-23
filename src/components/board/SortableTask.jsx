import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { COLOR_VARIANTS } from '@/constants/theme';
import { ArrowRight } from 'lucide-react';

export default function SortableTask({ task, onClick }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: task.id,
        data: {
            type: 'Task',
            task
        }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    const colors = COLOR_VARIANTS[task.projectColor] || COLOR_VARIANTS['blue'];

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-sm hover:border-zinc-700 cursor-grab active:cursor-grabbing group relative overflow-hidden"
        >
            {/* Glow Effect on Hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 -translate-x-full group-hover:translate-x-full transition-all duration-700 pointer-events-none" />

            <div className="flex justify-between items-start mb-2">
                <h4 className="text-sm font-medium text-zinc-200 line-clamp-2 leading-tight">
                    {task.title}
                </h4>
                {task.priority && (
                    <div className={`w-1.5 h-1.5 rounded-full ${task.priority === 'HIGH' ? 'bg-red-500' :
                            task.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`} />
                )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-wider font-mono mt-3">
                <span>{task.id.slice(0, 4)}</span>
                <div className="flex -space-x-1">
                    {(task.responsibleUsers || []).slice(0, 3).map((u, i) => (
                        <div key={i} className="w-4 h-4 rounded-full bg-zinc-800 border border-black flex items-center justify-center text-[8px] text-zinc-400">
                            {u.name?.[0] || '?'}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
