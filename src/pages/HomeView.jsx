import React, { useMemo, useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { Plus, CheckSquare, ArrowRight } from 'lucide-react';
// import { getUserTasks } from '@/utils/userTasks'; // Unused now
import { hasPermission, PERMISSIONS } from '@/utils/accessControl';
import { COLOR_VARIANTS } from '@/constants/theme';
import PrismaticPanel from '@/components/ui/PrismaticPanel';
import { Skeleton } from '@/components/ui/skeleton';
import MonoScramble from '@/components/ui/MonoScramble';
import StatusLED from '@/components/ui/StatusLED';
import MechButton from '@/components/ui/MechButton';
import ProjectCard from '@/components/ProjectCard';
import SortableProjectItem from '@/components/SortableProjectItem';

export default function HomeView({
    currentUser,
    dailyPhrase,
    megaSenaNumbers,
    projects,
    setModalState,
    handleAccessProject,
    handleDeleteProject,
    onTaskClick,
    isLoading,
    onProjectReorder
}) {
    const safeProjects = useMemo(() => Array.isArray(projects) ? projects : [], [projects]);
    const safeMegaSena = useMemo(() => Array.isArray(megaSenaNumbers) ? megaSenaNumbers : [0, 0, 0, 0, 0, 0], [megaSenaNumbers]);

    const currentDate = useMemo(() => {
        return new Date().toLocaleDateString('pt-BR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        }).toUpperCase();
    }, []);

    const activeProjects = useMemo(() => {
        return safeProjects.filter(p => !p.isArchived && !p.deleted_at);
    }, [safeProjects]);

    const [userTasks, setUserTasks] = useState([]);

    // Fetch User Tasks
    useEffect(() => {
        if (!currentUser?.username) return;

        fetch('/api/v2/my-tasks')
            .then(res => res.ok ? res.json() : [])
            .then(data => setUserTasks(data))
            .catch(err => console.error("Failed to load user tasks", err));

    }, [currentUser?.username, projects]); // Re-fetch if projects change (e.g. mason update)

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const [activeDragId, setActiveDragId] = useState(null);

    const handleDragStart = (event) => {
        setActiveDragId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveDragId(null);

        if (active.id !== over?.id) {
            if (onProjectReorder) {
                onProjectReorder(active.id, over.id);
            }
        }
    };

    const activeDragProject = activeProjects.find(p => p.id === activeDragId);

    return (
        <div className="min-h-screen bg-black text-white pb-20 md:pb-8 relative overflow-hidden">

            {/* Grid de Fundo (Abismo) */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div
                    className="absolute inset-0 opacity-[0.15]"
                    style={{
                        backgroundImage: `linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)`,
                        backgroundSize: '40px 40px',
                        maskImage: 'radial-gradient(circle at center, black, transparent 80%)'
                    }}
                />
                <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/50 to-black" />
            </div>

            {/* Conteúdo Principal */}
            <div className="relative z-10 select-none">

                {/* --- SEÇÃO SUPERIOR (HERO + WIDGETS) --- */}
                <PrismaticPanel
                    className="mx-4 md:mx-10 mt-4 md:mt-6"
                    contentClassName="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/10 min-h-[8rem] md:min-h-[10rem] !p-0"
                >
                    {/* COLUNA 1: HERO */}
                    <div className="w-full md:w-1/2 px-5 md:px-10 py-6 md:py-6 flex flex-col justify-center">
                        <h1 className="brick-title text-4xl md:text-6xl uppercase leading-[0.85] tracking-tighter">
                            Olá, <span className="text-zinc-700">{currentUser?.name || currentUser?.username || 'Visitante'}</span>
                        </h1>
                        <p className="brick-mono mt-4 text-[11px] md:text-[10px] text-zinc-600 tracking-[0.15em] md:tracking-[0.2em] uppercase font-medium">
                            <MonoScramble>{currentDate}</MonoScramble>
                        </p>
                    </div>

                    {/* COLUNA 2: SORTE */}
                    <div className="w-full md:w-1/4 px-5 md:px-10 py-5 md:py-6 flex flex-col justify-between">
                        <div className="flex items-center gap-3">
                            <StatusLED color="red" size="sm" />
                            <span className="brick-mono text-[10px] md:text-[9px] text-zinc-500 uppercase tracking-[0.15em] md:tracking-[0.2em] font-medium">Sorte do Dia</span>
                        </div>
                        <div className="flex-1 flex items-center mt-3">
                            <p className="font-sans text-sm md:text-sm text-zinc-300 italic leading-relaxed tracking-tight">
                                "{dailyPhrase || "O silêncio é uma resposta."}"
                            </p>
                        </div>
                    </div>

                    {/* COLUNA 3: PROBABILIDADE */}
                    <div className="w-full md:w-1/4 px-5 md:px-10 py-5 md:py-6 flex flex-col justify-between">
                        <div className="flex items-center gap-3 mb-4 md:mb-0">
                            <StatusLED color="green" size="sm" />
                            <span className="brick-mono text-[10px] md:text-[9px] text-zinc-500 uppercase tracking-[0.15em] md:tracking-[0.2em] font-medium">Probabilidade</span>
                        </div>
                        <div className="flex-1 flex items-center">
                            <div className="flex gap-2 w-full justify-between">
                                {safeMegaSena.map((n, i) => (
                                    <div key={i} className="brick-mono flex-1 aspect-square flex items-center justify-center border border-white/10 bg-black/20 text-zinc-500 text-xs md:text-[10px] font-medium hover:border-emerald-900 hover:text-emerald-500 transition-colors cursor-default touch-target">
                                        {n.toString().padStart(2, '0')}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </PrismaticPanel>

                {/* SECTION: MINHAS TAREFAS (Simplified Design) */}
                <div className="mx-4 md:mx-10 mt-5 md:mt-6 glass-panel border-white/5 bg-white/[0.02]">
                    <div className="px-5 md:px-10 py-5 md:py-6">
                        <div className="flex items-center gap-3 mb-5 md:mb-6">
                            <CheckSquare className="w-4 h-4 md:w-4 md:h-4 text-zinc-500" />
                            <h2 className="brick-mono text-xs md:text-xs text-zinc-500 uppercase tracking-[0.15em] md:tracking-[0.2em] font-medium">
                                Minhas Tarefas
                            </h2>
                            <span className="brick-mono text-xs md:text-xs text-zinc-700 uppercase tracking-widest font-medium">
                                ({userTasks.length})
                            </span>
                        </div>

                        {userTasks.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-3">
                                {userTasks.slice(0, 6).map((task) => {
                                    const colors = COLOR_VARIANTS[task.projectColor] || COLOR_VARIANTS['blue'];
                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => onTaskClick && onTaskClick(task)}
                                            className="group flex flex-col justify-between bg-black/20 hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all active:scale-[0.98] active:bg-white/5 cursor-pointer touch-feedback p-4 md:p-4 h-32 md:h-28 min-h-[8rem] md:min-h-[7rem]"
                                        >
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="brick-title text-sm text-white uppercase tracking-wide line-clamp-2 pr-4">
                                                        {task.title}
                                                    </h3>
                                                    <div className={`w-1 h-1 rounded-full ${colors.bg}`} />
                                                </div>
                                                <p className="brick-mono text-[10px] text-zinc-600 uppercase tracking-widest font-medium">
                                                    {task.projectName}
                                                </p>
                                            </div>
                                            <div className="flex justify-between items-end mt-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex -space-x-1.5">
                                                        {(task.responsibleUsers || []).slice(0, 3).map((u, i) => {
                                                            // Handle both string and object user formats (legacy vs new)
                                                            const name = typeof u === 'string' ? u : (u.name || u.username || '?');
                                                            const initial = name[0]?.toUpperCase() || '?';
                                                            return (
                                                                <div key={i} className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[9px] text-zinc-400 ring-1 ring-zinc-950 group-hover:ring-zinc-800">
                                                                    {initial}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <ArrowRight className="w-3 h-3 text-zinc-800 group-hover:text-white transition-colors" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8">
                                <p className="brick-title text-xl text-zinc-800 uppercase tracking-tight">
                                    Tudo Limpo
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* SECTION: PROJETOS */}
                <div className="px-4 md:px-10 mt-8 md:mt-12">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0 mb-6 md:mb-8 border-b border-white/10 pb-4">
                        <h2 className="brick-mono text-xs md:text-xs text-zinc-400 uppercase tracking-[0.15em] md:tracking-[0.2em] font-medium">Projetos Ativos</h2>

                        <MechButton
                            primary
                            icon={Plus}
                            onClick={() => setModalState({ type: 'project', mode: 'create', isOpen: true })}
                            className="touch-target w-full sm:w-auto"
                        >
                            Novo Projeto
                        </MechButton>
                    </div>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={activeProjects.map(p => p.id)} strategy={rectSortingStrategy}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                {isLoading ? (
                                    // Skeletons de Carregamento
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="h-64 glass-panel p-8 flex flex-col justify-between overflow-hidden">
                                            <div className="flex justify-between items-start">
                                                <Skeleton className="w-4 h-4 rounded-full" />
                                                <Skeleton className="w-4 h-8" />
                                            </div>
                                            <div className="space-y-4">
                                                <Skeleton className="h-10 w-3/4" />
                                                <Skeleton className="h-4 w-full" />
                                                <Skeleton className="h-4 w-5/6" />
                                            </div>
                                            <div className="flex justify-between items-end border-t border-white/5 pt-4">
                                                <Skeleton className="h-3 w-20" />
                                                <Skeleton className="h-3 w-16" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    activeProjects.map(project => (
                                        <SortableProjectItem
                                            key={project.id}
                                            project={project}
                                            onEdit={(p) => setModalState({ type: 'project', mode: 'edit', isOpen: true, data: p })}
                                            onDelete={(p) => handleDeleteProject(p)}
                                            onSelect={async (p) => {
                                                if (p.isProtected) {
                                                    const password = prompt('Este projeto é protegido. Digite a senha:');
                                                    if (!password) return;
                                                    try {
                                                        const res = await fetch('/api/projects/verify-password', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ projectId: p.id, password })
                                                        });
                                                        if (res.ok) {
                                                            handleAccessProject(p);
                                                        } else {
                                                            alert('Senha incorreta.');
                                                        }
                                                    } catch {
                                                        alert('Erro ao verificar senha.');
                                                    }
                                                } else {
                                                    handleAccessProject(p);
                                                }
                                            }}
                                        />
                                    ))
                                )}

                                {/* Card de Adicionar Projeto */}
                                {hasPermission(currentUser, PERMISSIONS.CREATE_PROJECT) && (
                                    <button
                                        onClick={() => setModalState({ type: 'project', mode: 'create', isOpen: true })}
                                        className="h-40 min-h-[10rem] border border-white/10 border-dashed hover:border-white/30 hover:bg-white/5 transition-all outline-none group flex flex-col items-center justify-center gap-4 cursor-pointer"
                                    >
                                        <div className="w-12 h-12 border border-zinc-800 bg-black/50 flex items-center justify-center group-hover:border-white transition-colors duration-300">
                                            <Plus className="w-5 h-5 text-zinc-500 group-hover:text-white" />
                                        </div>
                                        <span className="brick-mono text-xs font-bold uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400">NOVO PROJETO</span>
                                    </button>
                                )}
                            </div>
                        </SortableContext>
                        <DragOverlay>
                            {activeDragProject ? (
                                <ProjectCard project={activeDragProject} isOverlay />
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                </div>
            </div>
        </div>
    );
}
