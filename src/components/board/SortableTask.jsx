import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { COLOR_VARIANTS } from '@/constants/theme';
import { cn } from '@/lib/utils';
import { MessageSquare, Paperclip } from 'lucide-react';

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

    // Color definitions for left strip
    const colorMap = {
        red: 'bg-red-500',
        green: 'bg-green-500',
        blue: 'bg-blue-500',
        yellow: 'bg-yellow-500',
        purple: 'bg-purple-500',
        pink: 'bg-pink-500',
        zinc: 'bg-zinc-500',
    };

    // Priority indicator colors
    const priorityColorMap = {
        HIGH: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
        MEDIUM: 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]',
        LOW: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]',
    };

    const stripColor = colorMap[task.projectColor] || 'bg-zinc-700';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={cn(
                "group relative bg-zinc-900 border border-transparent rounded-r-md overflow-hidden transition-all duration-200",
                "hover:border-zinc-700 hover:bg-zinc-800/80 hover:translate-x-1 cursor-grab active:cursor-grabbing",
                "shadow-sm hover:shadow-lg"
            )}
        >
            {/* Left Color Strip */}
            <div className={`absolute top-0 bottom-0 left-0 w-1 ${stripColor} opacity-70 group-hover:opacity-100 flex-shrink-0`} />

            <div className="pl-4 pr-3 py-3 flex flex-col gap-2">
                {/* Header */}
                <div className="flex justify-between items-start gap-2">
                    <h4 className="text-[13px] font-medium text-zinc-200 line-clamp-2 leading-snug group-hover:text-white transition-colors">
                        {task.title}
                    </h4>
                    {task.priority && (
                        <div className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${priorityColorMap[task.priority] || 'bg-zinc-700'}`} />
                    )}
                </div>

                {/* Footer / Meta */}
                <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-zinc-600 font-mono tracking-wider group-hover:text-zinc-500">
                        {task.id.slice(0, 4)}
                    </span>

                    <div className="flex items-center gap-3">
                        {/* Icons for attachments/comments could go here if data existed */}
                        {/* <div className="flex items-center gap-2 text-zinc-700 group-hover:text-zinc-500">
                             <MessageSquare className="w-3 h-3" />
                             <span className="text-[10px]">2</span>
                         </div> */}

                        <div className="flex -space-x-1.5">
                            {(task.responsibleUsers || []).slice(0, 3).map((u, i) => (
                                <div key={i} className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[9px] text-zinc-400 ring-1 ring-zinc-950 group-hover:ring-zinc-800">
                                    {u.name?.[0]?.toUpperCase() || '?'}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
