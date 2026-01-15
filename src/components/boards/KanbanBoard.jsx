import { useMemo, useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Checkbox } from '../ui/checkbox';
import MechButton from '../ui/MechButton';
import StatusLED from '../ui/StatusLED';
import ResponsibleUsersButton from '../ResponsibleUsersButton';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function KanbanBoard({
    data,
    currentBoardType,

    // Drag & Drop
    handleDragOver,
    handleDrop,
    handleDragStart,
    handleDragEnter,
    dragOverTargetId,

    // Actions
    handleTaskAction,
    setModalState
}) {
    const [draggingId, setDraggingId] = useState(null);
    const [dragOverListId, setDragOverListId] = useState(null);

    const todoListIds = useMemo(() => {
        if (currentBoardType !== 'todo') return { doneListId: null, defaultListId: null };
        const lists = Array.isArray(data?.lists) ? data.lists : [];
        if (lists.length === 0) return { doneListId: null, defaultListId: null };

        const normalize = (value) => String(value || '').trim().toLowerCase();

        const done =
            lists.find((l) => normalize(l.id) === 'l3') ||
            lists.find((l) => normalize(l.title).includes('conclu')) ||
            lists[lists.length - 1];

        const defaults = lists.find((l) => normalize(l.id) === 'l1') || lists[0];

        return {
            doneListId: done?.id || null,
            defaultListId: defaults?.id || null
        };
    }, [currentBoardType, data?.lists]);


    return (
        <>
            {/* KANBAN VIEW */}
            {currentBoardType === 'kanban' && (
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                        visible: { transition: { staggerChildren: 0.05 } }
                    }}
                    className="flex h-full gap-0 border-l border-zinc-900 min-w-max"
                >
                    {data.lists ? data.lists.map(list => (
                        <motion.div
                            variants={{
                                hidden: { opacity: 0, x: 20 },
                                visible: { opacity: 1, x: 0 }
                            }}
                            key={list.id} className={`w-72 flex flex-col h-full bg-black border-r border-zinc-900 transition-colors ${dragOverListId === list.id ? 'bg-zinc-900/50' : ''}`}
                            onDragOver={(e) => {
                                handleDragOver(e);
                                setDragOverListId(list.id);
                            }}
                            onDragLeave={() => setDragOverListId(null)}
                            onDrop={(e) => {
                                handleDrop(e, list.id, 'list');
                                setDragOverListId(null);
                                setDraggingId(null);
                            }}
                        >
                            <div
                                className={`p-4 border-b border-zinc-900 flex justify-between items-center cursor-grab active:cursor-grabbing group/header ${draggingId === list.id ? 'opacity-40' : ''}`}
                                draggable
                                onDragStart={(e) => {
                                    handleDragStart(e, list, 'list');
                                    setDraggingId(list.id);
                                }}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, list.id, 'list')}
                                onDragEnd={() => setDraggingId(null)}
                            >
                                <div className="flex items-center gap-2 flex-1">
                                    <GripVertical className="h-3 w-3 text-zinc-700 opacity-0 group-hover/header:opacity-100 transition-opacity" />
                                    <input
                                        className="bg-transparent border-none font-bold text-sm uppercase tracking-[0.2em] text-zinc-500 focus:text-white focus:outline-none w-full"
                                        defaultValue={list.title}
                                        onBlur={(e) => {
                                            if (e.target.value !== list.title) {
                                                handleTaskAction('updateColumn', { listId: list.id, updates: { title: e.target.value } });
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') e.target.blur();
                                        }}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <button
                                                className="h-8 w-8 flex items-center justify-center rounded-none border border-transparent hover:border-red-900/50 hover:bg-red-950/20 text-zinc-800 hover:text-red-600 transition-all group/del"
                                                title="Excluir Coluna"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="glass-panel border-zinc-800 rounded-none bg-black/90">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="text-white uppercase tracking-tighter font-black">Confirmar Exclusão</AlertDialogTitle>
                                                <AlertDialogDescription className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
                                                    Esta ação não pode ser desfeita. Isso excluirá permanentemente a coluna "{list.title}" e todas as tarefas vinculadas.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="rounded-none border-zinc-800 bg-transparent text-zinc-500 hover:bg-zinc-900 hover:text-white uppercase text-[10px] font-bold tracking-widest h-10">Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleTaskAction('deleteColumn', { listId: list.id })}
                                                    className="rounded-none bg-red-600 hover:bg-red-700 text-white uppercase text-[10px] font-bold tracking-widest h-10"
                                                >
                                                    Excluir
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                            <div
                                className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar bg-black"
                                onDragOver={handleDragOver}
                                onDrop={(e) => {
                                    handleDrop(e, list.id, 'list');
                                    setDraggingId(null);
                                }}
                            >
                                <AnimatePresence>
                                    {list.tasks?.map(task => (
                                        <motion.div
                                            key={task.id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            draggable
                                            onDragStart={(e) => {
                                                handleDragStart(e, task, 'task', list.id);
                                                setDraggingId(task.id);
                                            }}
                                            onDragEnd={() => setDraggingId(null)}
                                            onDragEnter={(e) => handleDragEnter(e, task.id, list.id)}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleDrop(e, list.id, 'list');
                                                setDraggingId(null);
                                            }}
                                            onClick={() => setModalState({ type: 'task', mode: 'edit', isOpen: true, data: task, listId: list.id })}
                                            className={`bg-zinc-950 border border-zinc-900 hover:border-zinc-700 cursor-grab active:cursor-grabbing p-4 group transition-all relative ${dragOverTargetId === task.id ? 'before:content-[""] before:absolute before:-top-[2px] before:left-0 before:right-0 before:h-[2px] before:bg-red-600 before:shadow-[0_0_8px_rgba(220,38,38,0.8)]' : ''} ${draggingId === task.id ? 'opacity-40 grayscale' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-2 gap-2">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <GripVertical className="h-3 w-3 text-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                                    <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors uppercase leading-tight truncate">{task.title}</span>
                                                </div>
                                                {task.priority === 'high' && <StatusLED color="red" size="sm" className="shrink-0" />}
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-zinc-900/50 mt-2">
                                                {task.responsibleUsers?.length > 0 && <ResponsibleUsersButton users={task.responsibleUsers} />}
                                                {task.endDate && <span className="text-xs text-zinc-600 font-mono font-medium">{new Date(task.endDate).toLocaleDateString().slice(0, 5)}</span>}
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                <MechButton
                                    className="w-full border-dashed border-zinc-900 text-zinc-700 hover:text-white hover:bg-zinc-950 h-10"
                                    icon={Plus}
                                    onClick={() => setModalState({ type: 'task', mode: 'create', isOpen: true, data: { listId: list.id } })}
                                >
                                    Adicionar
                                </MechButton>
                            </div>
                        </motion.div>
                    )) : <div className="p-8 text-zinc-500 text-xs">Nenhum dado encontrado para este quadro.</div>}

                    <div className="w-72 flex flex-col h-full bg-black/50 border-r border-zinc-900 items-center justify-center p-6">
                        <MechButton
                            className="w-full border-dashed border-zinc-800 text-zinc-600 hover:text-white hover:bg-zinc-950 h-12"
                            icon={Plus}
                            onClick={() => handleTaskAction('addColumn', { title: 'Nova Coluna' })}
                        >
                            Nova Coluna
                        </MechButton>
                    </div>
                </motion.div>
            )}

            {/* TODO LIST VIEW */}
            {currentBoardType === 'todo' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-4xl mx-auto space-y-8"
                >
                    {data.lists ? data.lists.map(list => (
                        <div
                            key={list.id}
                            className={`space-y-0 transition-opacity ${draggingId === list.id ? 'opacity-40' : ''}`}
                        >
                            <div
                                className="cursor-grab active:cursor-grabbing group/header"
                                draggable
                                onDragStart={(e) => {
                                    handleDragStart(e, list, 'list');
                                    setDraggingId(list.id);
                                }}
                                onDragEnd={() => setDraggingId(null)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => {
                                    handleDrop(e, list.id, 'list');
                                    setDraggingId(null);
                                }}
                            >
                                <div className="flex items-center justify-between mb-2 pl-4 border-l-2 border-red-600 group">
                                    <div className="flex items-center gap-2 flex-1">
                                        <GripVertical className="h-3 w-3 text-zinc-800 opacity-0 group-hover/header:opacity-100 transition-opacity" />
                                        <input
                                            className="bg-transparent border-none text-sm font-bold text-zinc-600 uppercase tracking-[0.3em] focus:text-white focus:outline-none w-full"
                                            defaultValue={list.title}
                                            onBlur={(e) => {
                                                if (e.target.value !== list.title) {
                                                    handleTaskAction('updateColumn', { listId: list.id, updates: { title: e.target.value } });
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') e.target.blur();
                                            }}
                                        />
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <button
                                                className="h-8 w-8 flex items-center justify-center rounded-none border border-transparent hover:border-red-900/50 hover:bg-red-950/20 text-zinc-800 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="glass-panel border-zinc-800 rounded-none bg-black/90">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="text-white uppercase tracking-tighter font-black">Confirmar Exclusão</AlertDialogTitle>
                                                <AlertDialogDescription className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
                                                    Esta ação não pode ser desfeita. Isso excluirá permanentemente a lista "{list.title}" e todas as tarefas vinculadas.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="rounded-none border-zinc-800 bg-transparent text-zinc-500 hover:bg-zinc-900 hover:text-white uppercase text-[10px] font-bold tracking-widest h-10">Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleTaskAction('deleteColumn', { listId: list.id })}
                                                    className="rounded-none bg-red-600 hover:bg-red-700 text-white uppercase text-[10px] font-bold tracking-widest h-10"
                                                >
                                                    Excluir
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                            <div className="bg-black border-t border-zinc-900">
                                <AnimatePresence>
                                    {list.tasks?.map(task => (
                                        <motion.div
                                            key={task.id}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            className="p-3 flex items-center gap-4 border-b border-zinc-900 hover:bg-zinc-950/50 transition-colors group"
                                        >
                                            <Checkbox
                                                checked={todoListIds.doneListId ? list.id === todoListIds.doneListId : false}
                                                onCheckedChange={(checked) => {
                                                    const isChecked = checked === true;
                                                    const targetListId = isChecked ? todoListIds.doneListId : todoListIds.defaultListId;
                                                    if (!targetListId || targetListId === list.id) return;
                                                    handleTaskAction('move', { taskId: task.id, fromListId: list.id, toListId: targetListId });
                                                }}
                                                className="border-zinc-800 data-[state=checked]:bg-white data-[state=checked]:text-black rounded-none w-4 h-4"
                                            />
                                            <div className="flex-1 cursor-pointer" onClick={() => setModalState({ type: 'task', mode: 'edit', isOpen: true, data: task, listId: list.id })}>
                                                <p className="text-base font-medium text-zinc-300 group-hover:text-white transition-colors uppercase tracking-wide">{task.title}</p>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-4">
                                                <span className="text-xs font-mono uppercase text-zinc-600 font-medium">{task.priority}</span>
                                                <button
                                                    className="h-8 w-8 flex items-center justify-center text-zinc-700 hover:text-red-600 transition-colors glitch-hover"
                                                    onClick={() => handleTaskAction('delete', { taskId: task.id })}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                <MechButton
                                    className="w-full text-zinc-600 hover:text-white justify-start h-10 px-4 border-0 hover:bg-zinc-950"
                                    icon={Plus}
                                    onClick={() => setModalState({ type: 'task', mode: 'create', isOpen: true, data: { listId: list.id } })}
                                >
                                    Inserir Dados
                                </MechButton>
                            </div>
                        </div>
                    )) : <div className="p-8 text-zinc-500 text-xs">Lista não inicializada.</div>}

                    <div className="flex justify-center p-8">
                        <MechButton
                            className="border-dashed border-zinc-800 text-zinc-600 hover:text-white hover:bg-zinc-950 h-12 px-8"
                            icon={Plus}
                            onClick={() => handleTaskAction('addColumn', { title: 'Nova Lista' })}
                        >
                            Nova Lista
                        </MechButton>
                    </div>
                </motion.div>
            )}
        </>
    );
}
