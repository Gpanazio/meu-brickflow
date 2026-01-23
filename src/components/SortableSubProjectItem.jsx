import React, { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FolderOpen, MoreVertical, GripVertical, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { COLOR_VARIANTS } from '@/constants/theme';

export function SortableSubProjectItem({ sub, onClick, onEdit, onDelete, isDragging: isOverlay }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isSortableDragging
    } = useSortable({
        id: sub.id,
        data: { type: 'subproject', sub }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isSortableDragging ? 0.3 : 1,
        boxShadow: isSortableDragging ? '0 0 20px rgba(255,255,255,0.1)' : 'none',
        position: 'relative',
        touchAction: 'none' // Important for touch devices
    };

    const colors = COLOR_VARIANTS[sub.color] || COLOR_VARIANTS['zinc'] || COLOR_VARIANTS['blue'];

    // Use overlay mode style or normal style
    if (isOverlay) {
        return (
            <div className="group cursor-grabbing glass-panel bg-zinc-900 border-zinc-700 p-6 flex flex-col justify-between h-48 relative shadow-2xl scale-105">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-white" />
                        <FolderOpen className={`h-5 w-5 ${colors.text}`} />
                    </div>
                </div>
                <div>
                    <CardTitle className="text-xl font-bold uppercase tracking-tight text-white mb-1">{sub.name}</CardTitle>
                    <span className="text-zinc-500 text-sm font-mono uppercase tracking-widest line-clamp-1">{sub.description || "---"}</span>
                </div>
            </div>
        )
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            onClick={onClick}
            className={`group cursor-pointer glass-panel hover:bg-white/5 transition-all p-6 flex flex-col justify-between h-48 relative ${isSortableDragging ? 'opacity-40 grayscale' : ''}`}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    {/* Drag Handle */}
                    <div
                        {...listeners}
                        className="p-1 -ml-1 cursor-grab active:cursor-grabbing hover:bg-white/10 rounded"
                        onClick={(e) => e.stopPropagation()} // Prevent nav click
                    >
                        <GripVertical className="h-4 w-4 text-zinc-700 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <FolderOpen className={`h-5 w-5 ${colors.text} opacity-50 group-hover:opacity-100 transition-opacity`} />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white rounded-none">
                            <MoreVertical className="h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass-panel rounded-none border-zinc-800 bg-black/90">
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); onEdit(sub); }} className="text-[10px] uppercase tracking-widest h-8 cursor-pointer text-zinc-400 hover:text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                            Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-red-900 focus:text-red-500 focus:bg-red-950/20 text-[10px] uppercase tracking-widest h-8 cursor-pointer"
                            onClick={e => { e.stopPropagation(); onDelete(sub); }}
                        >
                            Excluir
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div>
                <CardTitle className="text-xl font-bold uppercase tracking-tight text-white mb-1 leading-none">{sub.name}</CardTitle>
                <span className="text-zinc-500 text-xs font-mono uppercase tracking-widest line-clamp-1">{sub.description || "---"}</span>
            </div>

            {/* Corner Accent */}
            <div className={`absolute bottom-0 right-0 w-8 h-8 opacity-0 group-hover:opacity-20 transition-opacity bg-gradient-to-tl ${colors.from} to-transparent`} />
        </div>
    );
}
