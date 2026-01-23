import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, History, ChevronDown, Lock } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import MechButton from '@/components/ui/MechButton';
import { AnimatePresence, motion } from 'framer-motion';

// DnD Kit
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableSubProjectItem } from '@/components/SortableSubProjectItem';

export default function ProjectView({
    currentProject,
    setCurrentView,
    setModalState,
    handleAccessProject,
    handleDeleteProject, // Expects (item, isSubProject)
    onSubProjectReorder, // New Handler
    history,
    isHistoryLoading,
    historyError,
    onRestoreEvent,
    users
}) {
    const [activeDragId, setActiveDragId] = useState(null);

    const activeSubProjects = useMemo(() => {
        // Usually sorted by order_index from Backend, but lets rely on parent state order
        // Parent should pass ordered list via currentProject.subProjects
        return currentProject?.subProjects?.filter(s => !s.isArchived && !s.deleted_at) || [];
    }, [currentProject]);

    const usersMap = useMemo(() => {
        return new Map((users || []).map(user => [user.username, user.displayName || user.username]));
    }, [users]);

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event) => {
        setActiveDragId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveDragId(null);
        if (active.id !== over?.id && onSubProjectReorder) {
            onSubProjectReorder(active.id, over.id);
        }
    };

    const formatTimestamp = (value) => {
        if (!value) return 'Sem data';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Data inválida';
        return date.toLocaleString('pt-BR');
    };

    const formatAction = (action) => {
        const map = {
            'create': 'Criado', 'update': 'Atualizado', 'delete': 'Excluído', 'restore': 'Restaurado'
        };
        return map[action] || action || 'Alterado';
    };

    if (!currentProject) return null; // Or loader

    const activeSubProjectItem = activeSubProjects.find(s => s.id === activeDragId);

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20 relative overflow-hidden min-h-screen">
            {/* Background (Same as HomeView) */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-80" />
                <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(zinc-800 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            </div>

            <div className="relative z-10 space-y-8 px-4 md:px-8 mt-6">
                {/* Header */}
                <div className="flex flex-col gap-6 border-b border-white/10 pb-6">
                    <div className="flex justify-between items-center">
                        <MechButton
                            onClick={() => setCurrentView('home')}
                            icon={ArrowLeft}
                            className="h-9 px-4 text-xs"
                        >
                            Voltar
                        </MechButton>
                        <MechButton
                            primary
                            icon={Plus}
                            onClick={() => setModalState({ type: 'subProject', mode: 'create', isOpen: true })}
                        >
                            Nova Área
                        </MechButton>
                    </div>

                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                            {currentProject.name}
                            {currentProject.isProtected && <Lock className="h-6 w-6 text-zinc-700" />}
                        </h1>
                        <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mt-2 max-w-2xl">
                            {currentProject.description}
                        </p>
                    </div>
                </div>

                {/* History Collapsible */}
                <Collapsible>
                    <CollapsibleTrigger className="w-full group">
                        <div className="glass-panel p-4 flex items-center justify-between cursor-pointer border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300">
                                <History className="h-4 w-4" /> Histórico
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] text-zinc-700 font-mono uppercase tracking-widest">
                                    {isHistoryLoading ? 'Carregando...' : `${history?.length || 0} eventos`}
                                </span>
                                <ChevronDown className="h-4 w-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                            </div>
                        </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="glass-panel p-4 space-y-2 mt-2 bg-black/40">
                            {(!history || history.length === 0) && (
                                <div className="text-[10px] text-zinc-600 font-mono text-center py-4">Nenhum registro encontrado.</div>
                            )}
                            {history?.map(event => (
                                <div key={event.id} className="flex justify-between items-center p-3 border-b border-white/5 last:border-0 hover:bg-white/5">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">{formatAction(event.action_type)}</span>
                                        <span className="text-[9px] text-zinc-600 font-mono">{formatTimestamp(event.timestamp)} • {usersMap.get(event.user_id) || 'Sistema'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CollapsibleContent>
                </Collapsible>

                {/* Subprojects Grid (DnD) */}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={activeSubProjects.map(s => s.id)} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
                            {activeSubProjects.map(sub => (
                                <SortableSubProjectItem
                                    key={sub.id}
                                    sub={sub}
                                    onClick={() => handleAccessProject(sub)}
                                    onEdit={() => setModalState({ type: 'subProject', mode: 'edit', isOpen: true, data: sub })}
                                    onDelete={() => handleDeleteProject(sub, true)}
                                />
                            ))}

                            {/* Add Button Card */}
                            <div
                                onClick={() => setModalState({ type: 'subProject', mode: 'create', isOpen: true })}
                                className="glass-panel flex flex-col items-center justify-center cursor-pointer group hover:bg-white/5 transition-colors h-48 border-dashed border-zinc-800 hover:border-zinc-600"
                            >
                                <div className="w-10 h-10 rounded-full border border-zinc-800 flex items-center justify-center mb-3 group-hover:border-zinc-500 transition-colors">
                                    <Plus className="h-5 w-5 text-zinc-600 group-hover:text-zinc-300" />
                                </div>
                                <span className="text-xs font-mono uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400">NOVA ÁREA</span>
                            </div>
                        </div>
                    </SortableContext>

                    <DragOverlay>
                        {activeSubProjectItem && <SortableSubProjectItem sub={activeSubProjectItem} isDragging />}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
}
