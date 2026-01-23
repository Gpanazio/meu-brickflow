import { useMemo, useState } from 'react';
import { Plus, GripVertical, Target, Calendar } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Checkbox } from '../ui/checkbox';
import MechButton from '../ui/MechButton';
import StatusLED from '../ui/StatusLED';
import ResponsibleUsersButton from '../ResponsibleUsersButton';
import { format, isPast, isToday, isTomorrow, addDays, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function GoalsBoard({
    data,
    currentBoardType,
    handleTaskAction,
    setModalState
}) {
    // 1. Filter lists for 'GOALS' type
    // If explicit type 'GOALS' exists, use it. Failing that, fallback logic (optional)
    const goalLists = useMemo(() => {
        if (!data?.lists) return [];
        return data.lists.filter(l => l.type === 'GOALS' || l.title.includes('Prazo'));
    }, [data]);

    // 2. We want to display these lists as "Lanes" but perhaps visualized differently.
    // For MVP, we can reuse a column layout but with specific styling for Goals (e.g. emphasising Dates)

    // Helper to get relative date label
    const getDateLabel = (dateStr) => {
        if (!dateStr) return 'Sem Prazo';
        const date = new Date(dateStr);
        if (isPast(date) && !isToday(date)) return 'Atrasado';
        if (isToday(date)) return 'Hoje';
        if (isTomorrow(date)) return 'Amanhã';
        if (isThisWeek(date)) return 'Esta Semana';
        return format(date, 'dd/MM/yyyy');
    };

    const getDateColor = (dateStr) => {
        if (!dateStr) return 'text-zinc-600';
        const date = new Date(dateStr);
        if (isPast(date) && !isToday(date)) return 'text-red-500 font-bold';
        if (isToday(date)) return 'text-amber-500 font-bold';
        return 'text-zinc-400';
    };

    return (
        <div className="flex flex-col h-full overflow-x-auto">
            {/* Header / Instructions */}
            <div className="p-8 pb-4">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
                    <Target className="text-red-600 h-6 w-6" />
                    Metas & Prazos
                </h2>
                <p className="text-zinc-500 text-sm font-mono mt-2 max-w-2xl">
                    Visualize seus objetivos classificados por horizonte de tempo. Defina datas de entrega para ver o progresso.
                </p>
            </div>

            <div className="flex-1 flex gap-6 p-8 min-w-max">
                {goalLists.map(list => (
                    <motion.div
                        key={list.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-96 flex flex-col h-full bg-zinc-950/50 border border-zinc-900 rounded-none relative group/list"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-zinc-900 bg-black/50 backdrop-blur-sm flex justify-between items-center sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className={`h-2 w-2 rounded-full ${list.title.includes('Curto') ? 'bg-red-500' : list.title.includes('Médio') ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-300">{list.title}</h3>
                            </div>
                            <span className="text-xs font-mono text-zinc-600">{list.tasks?.length || 0}</span>
                        </div>

                        {/* Tasks */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            <AnimatePresence>
                                {list.tasks?.map(task => (
                                    <motion.div
                                        key={task.id}
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        onClick={() => setModalState({ type: 'task', mode: 'edit', isOpen: true, data: task, listId: list.id })}
                                        className="bg-black border border-zinc-900 hover:border-zinc-700 p-4 cursor-pointer group transition-all relative hover:shadow-lg hover:shadow-black/50"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-sm font-bold text-zinc-200 group-hover:text-white uppercase leading-tight line-clamp-2">{task.title}</span>
                                            {task.priority === 'high' && <StatusLED color="red" size="sm" />}
                                        </div>

                                        <div className="flex justify-between items-end border-t border-zinc-900/50 pt-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Prazo</span>
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3 h-3 text-zinc-700" />
                                                    <span className={`text-xs font-mono uppercase ${getDateColor(task.endDate)}`}>
                                                        {getDateLabel(task.endDate)}
                                                    </span>
                                                </div>
                                            </div>

                                            {task.responsibleUsers?.length > 0 && (
                                                <ResponsibleUsersButton users={task.responsibleUsers} />
                                            )}
                                        </div>

                                        {/* Progress Bar if checkitems exist */}
                                        {task.checklists?.length > 0 && (
                                            <div className="mt-3 h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-zinc-700 group-hover:bg-red-600 transition-colors"
                                                    style={{ width: `${(task.checklists.filter(i => i.completed).length / task.checklists.length) * 100}%` }}
                                                />
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            <MechButton
                                className="w-full border-dashed border-zinc-900 text-zinc-700 hover:text-white hover:bg-zinc-900 h-12"
                                icon={Plus}
                                onClick={() => setModalState({ type: 'task', mode: 'create', isOpen: true, data: { listId: list.id } })}
                            >
                                Nova Meta
                            </MechButton>
                        </div>
                    </motion.div>
                ))}

                {/* Empty State */}
                {goalLists.length === 0 && (
                    <div className="p-8 text-zinc-500 border border-dashed border-zinc-800 flex items-center justify-center h-64 w-full">
                        <div className="text-center">
                            <p className="text-sm uppercase tracking-widest font-bold">Nenhuma lista de metas encontrada</p>
                            <p className="text-xs text-zinc-600 mt-2">Peça ao Mason para "Criar listas de metas" ou adicione manualmente.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
