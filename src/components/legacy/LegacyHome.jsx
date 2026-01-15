import { useMemo } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Lock, CheckSquare, ArrowRight } from 'lucide-react';
import { getUserTasks } from '@/utils/userTasks';
import { hasPermission, PERMISSIONS } from '@/utils/accessControl';
import { COLOR_VARIANTS } from '@/constants/theme';
import PrismaticPanel from '@/components/ui/PrismaticPanel';
import { Skeleton } from '@/components/ui/skeleton';
import MonoScramble from '@/components/ui/MonoScramble';
import StatusLED from '@/components/ui/StatusLED';
import MechButton from '@/components/ui/MechButton';

function LegacyHome({
  currentUser,
  dailyPhrase,
  megaSenaNumbers,
  projects,
  setModalState,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleAccessProject,
  handleDeleteProject,
  onTaskClick,
  isLoading
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

  const userTasks = useMemo(() => {
    if (!currentUser?.username) return [];
    return getUserTasks(safeProjects, currentUser.username);
  }, [safeProjects, currentUser?.username]);

  return (
    <div className="min-h-screen bg-black text-white pb-20 relative overflow-hidden">

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
      <div className="relative z-10">

        {/* --- SEÇÃO SUPERIOR (HERO + WIDGETS) --- */}
        <PrismaticPanel
          className="mx-6 md:mx-10 mt-6"
          contentClassName="flex flex-row divide-x divide-white/10 min-h-[8rem] md:min-h-[10rem] overflow-x-auto no-scrollbar !p-0"
        >
          {/* COLUNA 1: HERO */}
          <div className="w-[50%] md:w-1/2 px-4 md:px-10 py-6 flex flex-col justify-center min-w-[200px]">
            <h1 className="brick-title text-2xl md:text-6xl uppercase leading-[0.85] tracking-tighter">
              Olá, <span className="text-zinc-700">{currentUser?.name || currentUser?.username || 'Visitante'}</span>
            </h1>
            <p className="brick-mono mt-4 text-[10px] text-zinc-600 tracking-[0.2em] uppercase font-medium">
              <MonoScramble>{currentDate}</MonoScramble>
            </p>
          </div>

          {/* COLUNA 2: SORTE */}
          <div className="w-[25%] md:w-1/4 px-4 md:px-10 py-6 flex flex-col justify-between min-w-[150px]">
            <div className="flex items-center gap-3">
              <StatusLED color="red" size="sm" />
              <span className="brick-mono text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-medium">Sorte do Dia</span>
            </div>
            <div className="flex-1 flex items-center mt-3">
              <p className="font-sans text-xs md:text-sm text-zinc-300 italic leading-relaxed tracking-tight line-clamp-3">
                "{dailyPhrase || "O silêncio é uma resposta."}"
              </p>
            </div>
          </div>

          {/* COLUNA 3: PROBABILIDADE */}
          <div className="w-[25%] md:w-1/4 px-4 md:px-10 py-6 flex flex-col justify-between min-w-[180px]">
            <div className="flex items-center gap-3 mb-2 md:mb-0">
              <StatusLED color="green" size="sm" />
              <span className="brick-mono text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-medium">Probabilidade</span>
            </div>
            <div className="flex-1 flex items-center">
              <div className="flex gap-1 md:gap-2 w-full justify-between">
                {safeMegaSena.map((n, i) => (
                  <div key={i} className="brick-mono flex-1 aspect-square flex items-center justify-center border border-white/10 bg-black/20 text-zinc-500 text-[10px] font-medium hover:border-emerald-900 hover:text-emerald-500 transition-colors cursor-default">
                    {n.toString().padStart(2, '0')}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PrismaticPanel>

        {/* SECTION: MINHAS TAREFAS (Simplified Design) */}
        <div className="mx-6 md:mx-10 mt-6 glass-panel border-white/5 bg-white/[0.02]">
          <div className="px-6 md:px-10 py-6">
            <div className="flex items-center gap-3 mb-6">
              <CheckSquare className="w-4 h-4 text-zinc-500" />
              <h2 className="brick-mono text-xs text-zinc-500 uppercase tracking-[0.2em] font-medium">
                Minhas Tarefas
              </h2>
              <span className="brick-mono text-xs text-zinc-700 uppercase tracking-widest font-medium">
                ({userTasks.length})
              </span>
            </div>

            {userTasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {userTasks.slice(0, 6).map((task) => {
                  const colors = COLOR_VARIANTS[task.projectColor] || COLOR_VARIANTS['blue'];
                  return (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick && onTaskClick(task)}
                      className="group flex flex-col justify-between bg-black/20 hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-pointer p-4 h-24"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="brick-title text-sm text-white uppercase tracking-wide truncate pr-4">
                            {task.title}
                          </h3>
                          <div className={`w-1 h-1 rounded-full ${colors.bg}`} />
                        </div>
                        <p className="brick-mono text-[10px] text-zinc-600 uppercase tracking-widest font-medium">
                          {task.projectName}
                        </p>
                      </div>
                      <div className="flex justify-between items-end mt-2">
                        <span className="brick-mono text-[9px] text-zinc-700 font-medium">{task.subProjectName}</span>
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
        <div className="px-8 mt-12">
          <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
            <h2 className="brick-mono text-xs text-zinc-400 uppercase tracking-[0.2em] font-medium">Projetos Ativos</h2>

            <MechButton
              primary
              icon={Plus}
              onClick={() => setModalState({ type: 'project', mode: 'create', isOpen: true })}
            >
              Novo Projeto
            </MechButton>
          </div>

          {/* Lista de Projetos Prismáticos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              activeProjects.map(project => {
                return (
                  <PrismaticPanel
                    key={project.id}
                    hoverEffect
                    draggable={true}
                    onDragStart={(e) => handleDragStart && handleDragStart(e, project, 'project')}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop && handleDrop(e, project.id, 'project')}
                    onClick={async () => {
                      if (project.isProtected) {
                        const password = prompt('Este projeto é protegido. Digite a senha:');
                        if (!password) return;

                        try {
                          const res = await fetch('/api/projects/verify-password', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ projectId: project.id, password })
                          });

                          if (res.ok) {
                            handleAccessProject(project);
                          } else {
                            alert('Senha incorreta.');
                          }
                        } catch {
                          alert('Erro ao verificar senha.');
                        }
                      } else {
                        handleAccessProject(project);
                      }
                    }}
                    className="h-64"
                    contentClassName="p-8 flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start z-10">
                      {/* LED de Status */}
                      <StatusLED color={project.color} size="md" />

                      <div className="flex gap-2">
                        {project.isProtected && <Lock className="w-3 h-3 text-zinc-600" />}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <button className="text-zinc-600 hover:text-white transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass-panel rounded-none min-w-[140px] bg-black border-zinc-800">
                            <DropdownMenuItem onClick={e => { e.stopPropagation(); setModalState({ type: 'project', mode: 'edit', isOpen: true, data: project }); }} className="text-xs uppercase tracking-widest h-9 cursor-pointer text-zinc-400 hover:text-white focus:bg-white/10 font-medium">
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-900 focus:text-red-500 focus:bg-white/10 text-xs uppercase tracking-widest cursor-pointer h-9 font-medium glitch-hover" onClick={e => { e.stopPropagation(); handleDeleteProject(project); }}>
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="space-y-4 z-10 relative">
                      <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-[0.85] group-hover:translate-x-1 transition-transform duration-300 drop-shadow-xl">
                        {project.name}
                      </h3>
                      <p className="brick-mono text-xs text-zinc-500 uppercase tracking-widest line-clamp-2 leading-relaxed font-medium">
                        {project.description || "SEM DESCRIÇÃO"}
                      </p>
                    </div>

                    <div className="flex justify-between items-end border-t border-white/5 pt-4 z-10">
                      <span className="brick-mono text-xs text-zinc-600 uppercase tracking-widest font-medium">
                        {project.subProjects?.length || 0} ÁREAS
                      </span>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                        <span className="text-xs font-bold uppercase text-white tracking-widest">Acessar</span>
                        <ArrowRight className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  </PrismaticPanel>
                );
              }))}

            {/* CARD DE ADICIONAR PROJETO */}
            {hasPermission(currentUser, PERMISSIONS.CREATE_PROJECT) && (
              <PrismaticPanel
                hoverEffect
                onClick={() => setModalState({ type: 'project', mode: 'create', isOpen: true })}
                className="h-64 border-dashed border-zinc-800 hover:border-zinc-600"
                contentClassName="flex flex-col items-center justify-center gap-4"
              >
                <div className="w-12 h-12 border border-zinc-800 bg-black/50 flex items-center justify-center group-hover:border-white transition-colors duration-300">
                  <Plus className="w-5 h-5 text-zinc-500 group-hover:text-white" />
                </div>
                <span className="brick-mono text-xs font-bold uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400">NOVO PROJETO</span>
              </PrismaticPanel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LegacyHome;
