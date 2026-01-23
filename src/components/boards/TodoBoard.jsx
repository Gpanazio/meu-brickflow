import React, { useMemo } from 'react';
import { Loader2, CheckCircle2, Circle, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { COLOR_VARIANTS } from '@/constants/theme';

export default function TodoBoard({
    boardData,
    onTaskClick,
    onTaskToggle, // New handler for checking off tasks directly
    isLoading
}) {
    const lists = useMemo(() => boardData?.lists || [], [boardData]);
    // Flatten tasks from all "TODO" lists for a unified view, or keep them categorized?
    // "Listas" usually implies a simple vertical list. 
    // If we have multiple lists (A Fazer, Fazendo, Concluido), we might want to show them as sections.

    return (
        <div className="flex-1 overflow-hidden h-full p-6 max-w-4xl mx-auto">
            <ScrollArea className="h-full pr-4">
                <div className="flex flex-col gap-8 pb-20">
                    {lists.map(list => (
                        <div key={list.id} className="flex flex-col gap-3">
                            <h3 className="brick-mono text-xs font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-800 pb-2 mb-2 flex justify-between items-center">
                                {list.title}
                                <span className="text-[10px] bg-zinc-900 px-2 py-0.5 rounded-full text-zinc-600">{(list.cards || list.tasks || []).length}</span>
                            </h3>

                            <div className="flex flex-col gap-2">
                                {(list.cards || list.tasks || []).map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => onTaskClick(task)}
                                        className="group flex items-center gap-3 p-3 rounded-lg bg-zinc-900/40 hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700 transition-all cursor-pointer"
                                    >
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onTaskToggle) onTaskToggle(task);
                                            }}
                                            className="shrink-0 text-zinc-600 hover:text-emerald-500 transition-colors"
                                        >
                                            {/* Logic for checked state would go here if we had 'status' or 'completed' flag on task */}
                                            {/* Assuming existence in 'DONE' list or explicit property */}
                                            <Circle className="w-5 h-5" />
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={cn(
                                                    "text-sm font-medium text-zinc-300 group-hover:text-white truncate transition-colors",
                                                    task.completed && "line-through text-zinc-600"
                                                )}>
                                                    {task.title}
                                                </span>
                                                {task.priority === 'HIGH' && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />}
                                            </div>
                                            {task.description && (
                                                <p className="text-[11px] text-zinc-500 truncate line-clamp-1">{task.description}</p>
                                            )}
                                        </div>

                                        <div className="flex -space-x-1.5 shrink-0">
                                            {(task.responsibleUsers || []).slice(0, 3).map((u, i) => (
                                                <div key={i} className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[9px] text-zinc-400 ring-1 ring-zinc-950 group-hover:ring-zinc-800">
                                                    {u.name?.[0]?.toUpperCase() || '?'}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {(list.cards || list.tasks || []).length === 0 && (
                                    <div className="p-4 border border-dashed border-zinc-800 rounded-lg flex items-center justify-center text-zinc-700 text-xs uppercase tracking-widest font-mono">
                                        Vazio
                                    </div>
                                )}

                                {/* Add Task Button for each list */}
                                <button
                                    onClick={() => onTaskClick({ listId: list.id, isNew: true })} // Signal new task
                                    className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40 text-zinc-600 hover:text-zinc-400 transition-all group"
                                >
                                    <div className="w-5 h-5 rounded-full border border-zinc-700 flex items-center justify-center group-hover:border-zinc-500">
                                        <Plus className="w-3 h-3" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-widest">Adicionar Tarefa</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
