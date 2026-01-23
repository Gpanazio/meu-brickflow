import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isTomorrow, isPast, isThisWeek, addDays, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, CheckCircle2, Circle, Clock, AlertCircle, Plus, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import MechButton from '../ui/MechButton';

// Utility to group tasks by date
const groupTasksByDate = (lists) => {
    const groups = {
        overdue: { title: 'Atrasado', tasks: [], color: 'text-red-500', borderColor: 'border-red-900/50' },
        today: { title: 'Hoje', tasks: [], color: 'text-green-500', borderColor: 'border-green-900/50' },
        tomorrow: { title: 'Amanhã', tasks: [], color: 'text-blue-500', borderColor: 'border-blue-900/50' },
        thisWeek: { title: 'Esta Semana', tasks: [], color: 'text-purple-500', borderColor: 'border-purple-900/50' },
        later: { title: 'Mais Tarde', tasks: [], color: 'text-zinc-500', borderColor: 'border-zinc-800' },
        noDate: { title: 'Sem Data', tasks: [], color: 'text-zinc-600', borderColor: 'border-zinc-800' }
    };

    lists.forEach(list => {
        (list.tasks || []).forEach(task => {
            // Add list info to task for context
            const enhancedTask = { ...task, listTitle: list.title, listId: list.id };

            if (!task.due_date) {
                groups.noDate.tasks.push(enhancedTask);
                return;
            }

            const date = parseISO(task.due_date);
            if (!isValid(date)) {
                groups.noDate.tasks.push(enhancedTask);
                return;
            }

            if (isPast(date) && !isToday(date)) {
                groups.overdue.tasks.push(enhancedTask);
            } else if (isToday(date)) {
                groups.today.tasks.push(enhancedTask);
            } else if (isTomorrow(date)) {
                groups.tomorrow.tasks.push(enhancedTask);
            } else if (isThisWeek(date)) {
                groups.thisWeek.tasks.push(enhancedTask);
            } else {
                groups.later.tasks.push(enhancedTask);
            }
        });
    });

    return groups;
};

const GoalsBoard = ({ data, handleTaskAction, setModalState }) => {
    // Only process GOALS type lists if possible, or all lists if mixed
    const goalLists = data?.lists || [];
    const groupedTasks = useMemo(() => groupTasksByDate(goalLists), [goalLists]);

    const handleCreateGoal = (groupKey) => {
        // Determine default date based on group
        let defaultDate = null;
        const today = new Date();

        if (groupKey === 'today') defaultDate = today;
        else if (groupKey === 'tomorrow') defaultDate = addDays(today, 1);
        else if (groupKey === 'thisWeek') defaultDate = addDays(today, 3); // Approx

        // Find the first available list to add to (usually "Curto Prazo" or similar)
        const targetList = goalLists[0];
        if (!targetList) return;

        // Open modal with pre-filled date context if feasible, or just quick add
        // For now, simpler: user creates via modal, we just trigger generic create
        setModalState({
            isOpen: true,
            type: 'create-task',
            listId: targetList.id,
            initialDate: defaultDate
        });
    };

    return (
        <div className="h-full overflow-y-auto p-4 md:p-8 pt-0 pb-32">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                {Object.entries(groupedTasks).map(([key, group]) => {
                    if (group.tasks.length === 0 && key === 'overdue') return null; // Hide overdue if empty

                    return (
                        <div key={key} className="flex flex-col gap-4">
                            <div className={cn("flex items-center justify-between border-b pb-2", group.borderColor)}>
                                <h3 className={cn("text-sm font-bold uppercase tracking-widest", group.color)}>
                                    {group.title} <span className="text-zinc-600 ml-2 text-xs">({group.tasks.length})</span>
                                </h3>
                                {key !== 'overdue' && (
                                    <button
                                        onClick={() => handleCreateGoal(key)}
                                        className="text-zinc-600 hover:text-white transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                {group.tasks.map(task => (
                                    <GoalCard key={task.id} task={task} />
                                ))}
                                {group.tasks.length === 0 && (
                                    <div className="h-24 border border-dashed border-zinc-800 rounded-lg flex items-center justify-center text-zinc-700 text-xs font-mono uppercase tracking-widest">
                                        Vazio
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const GoalCard = ({ task }) => {
    const date = task.due_date ? parseISO(task.due_date) : null;

    return (
        <motion.div
            layoutId={task.id}
            className="group relative bg-[#09090b] border border-zinc-800 hover:border-zinc-700 p-4 rounded-lg cursor-pointer transition-all hover:shadow-lg hover:shadow-black/50"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                    <div className="flex items-start gap-2">
                        {/* Status Indicator */}
                        <div className="mt-1">
                            <Circle className="w-3 h-3 text-zinc-600" />
                        </div>
                        <h4 className="text-sm font-medium text-zinc-200 leading-tight group-hover:text-white transition-colors">
                            {task.title}
                        </h4>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex items-center gap-3 pl-5">
                        {/* List/Category Badge */}
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                            {task.listTitle}
                        </span>

                        {/* Date Badge */}
                        {date && (
                            <div className={cn(
                                "flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider",
                                isPast(date) && !isToday(date) ? "text-red-400" :
                                    isToday(date) ? "text-green-400" : "text-zinc-500"
                            )}>
                                <Clock className="w-3 h-3" />
                                <span>{format(date, "dd/MM", { locale: ptBR })}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions (Hidden until hover) */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

export default GoalsBoard;
