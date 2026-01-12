import React, { useMemo } from 'react';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Plus, MoreVertical, Lock, Sparkles, Dna, CheckSquare, ArrowRight } from 'lucide-react';
import SudokuGame from '../SudokuGame';
import { getUserTasks } from '../../utils/userTasks';
import { hasPermission, PERMISSIONS } from '../../utils/accessControl';
import PrismaticPanel from '../ui/PrismaticPanel';

// Cores definidas internamente para blindagem visual
const DEFAULT_COLORS = {
  blue: { bg: 'bg-blue-600', shadow: 'shadow-[0_0_15px_rgba(37,99,235,0.5)]' },
  red: { bg: 'bg-red-600', shadow: 'shadow-[0_0_15px_rgba(220,38,38,0.5)]' },
  green: { bg: 'bg-green-600', shadow: 'shadow-[0_0_15px_rgba(22,163,74,0.5)]' },
  purple: { bg: 'bg-purple-600', shadow: 'shadow-[0_0_15px_rgba(147,51,234,0.5)]' },
  orange: { bg: 'bg-orange-600', shadow: 'shadow-[0_0_15px_rgba(234,88,12,0.5)]' },
  zinc: { bg: 'bg-zinc-600', shadow: 'shadow-[0_0_15px_rgba(82,82,91,0.5)]' }
};

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
  onTaskClick
}) {
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeMegaSena = Array.isArray(megaSenaNumbers) ? megaSenaNumbers : [0,0,0,0,0,0];

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
  }, [safeProjects, currentUser]);

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
        <PrismaticPanel className="mx-6 md:mx-10 mt-6 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-white/10 lg:h-40">
          {/* COLUNA 1: HERO */}
          <div className="lg:w-1/2 px-6 md:px-10 py-6 flex flex-col justify-center">
             <h1 className="brick-title text-4xl md:text-6xl uppercase leading-[0.85] tracking-tighter">
               Olá, <span className="text-zinc-700">{currentUser?.displayName || 'Visitante'}</span>
             </h1>
             <p className="brick-mono mt-4 text-[10px] text-zinc-600 tracking-[0.2em] uppercase">
               {currentDate}
             </p>
          </div>

          {/* COLUNA 2: SORTE */}
          <div className="lg:w-1/4 px-6 md:px-10 py-6 flex flex-col justify-between">
              <div className="flex items-center gap-3">
                  <Sparkles className="w-3 h-3 text-red-600" />
                  <span className="brick-mono text-[9px] text-zinc-500 uppercase tracking-[0.2em]">Sorte do Dia</span>
              </div>
              <div className="flex-1 flex items-center mt-3 lg:mt-0">
                  <p className="font-sans text-sm text-zinc-300 italic leading-relaxed tracking-tight">
                  "{dailyPhrase || "O silêncio é uma resposta."}"
                  </p>
              </div>
          </div>

          {/* COLUNA 3: PROBABILIDADE */}
          <div className="lg:w-1/4 px-6 md:px-10 py-6 flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4 lg:mb-0">
                  <Dna className="w-3 h-3 text-emerald-600" />
                  <span className="brick-mono text-[9px] text-zinc-500 uppercase tracking-[0.2em]">Probabilidade</span>
              </div>
              <div className="flex-1 flex items-center">
                  <div className="flex gap-2 w-full justify-between">
                      {safeMegaSena.map((n, i) => (
                          <div key={i} className="brick-mono flex-1 aspect-square flex items-center justify-center border border-white/10 bg-black/20 text-zinc-500 text-xs hover:border-emerald-900 hover:text-emerald-500 transition-colors cursor-default">
                              {n.toString().padStart(2, '0')}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
        </PrismaticPanel>

        {/* SUDOKU (Apenas Fran) */}
        {currentUser?.displayName === 'Fran' && (
          <PrismaticPanel className="mx-6 md:mx-10 mt-6 p-8">
             <SudokuGame />
          </PrismaticPanel>
        )}

        {/* SECTION: MINHAS TAREFAS */}
        <PrismaticPanel className="mx-6 md:mx-10 mt-6">
          <div className="px-6 md:px-10 py-6">
            <div className="flex items-center gap-3 mb-6">
              <CheckSquare className="w-4 h-4 text-red-600" />
              <h2 className="brick-mono text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
                Minhas Tarefas
              </h2>
              <span className="brick-mono text-[9px] text-zinc-700 uppercase tracking-widest">
                ({userTasks.length})
              </span>
            </div>

            {userTasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {userTasks.slice(0, 6).map((task) => {
                  const colors = DEFAULT_COLORS[task.projectColor] || DEFAULT_COLORS['blue'];
                  return (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick && onTaskClick(task)}
                      className="group flex flex-col justify-between bg-black/40 hover:bg-white/5 border border-zinc-900 hover:border-zinc-700 transition-all cursor-pointer p-4 h-24"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                           <h3 className="brick-title text-sm text-white uppercase tracking-wide truncate pr-4">
                             {task.title}
                           </h3>
                           <div className={`w-1.5 h-1.5 rounded-full ${colors.bg} ${colors.shadow}`} />
                        </div>
                        <p className="brick-mono text-[9px] text-zinc-600 uppercase tracking-widest">
                          {task.projectName}
                        </p>
                      </div>
                      <div className="flex justify-between items-end mt-2">
                         <span className="brick-mono text-[8px] text-zinc-700">{task.subProjectName}</span>
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
        </PrismaticPanel>

        {/* SECTION: PROJETOS */}
        <div className="px-8 mt-12">
          <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
            <h2 className="brick-mono text-[10px] text-zinc-400 uppercase tracking-[0.2em]">Projetos Ativos</h2>

            <Button
              onClick={() => setModalState({ type: 'project', mode: 'create', isOpen: true })}
              className="bg-white text-black hover:bg-zinc-200 h-10 px-6 text-[10px] uppercase font-black tracking-[0.2em] rounded-none transition-transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              <Plus className="mr-2 h-3 w-3" /> Novo Projeto
            </Button>
          </div>

          {/* Lista de Projetos Prismáticos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeProjects.map(project => {
              const colors = DEFAULT_COLORS[project.color] || DEFAULT_COLORS['blue'];
              
              return (
                <PrismaticPanel
                  key={project.id} 
                  hoverEffect
                  draggable={true}
                  onDragStart={(e) => handleDragStart && handleDragStart(e, project, 'project')}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop && handleDrop(e, project.id, 'project')}
                  onClick={() => handleAccessProject(project)} 
                  className="h-64 p-8 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start z-10">
                    {/* LED de Status */}
                    <div className={`w-1.5 h-1.5 rounded-full ${colors.bg} ${colors.shadow} animate-pulse`} />
                    
                    <div className="flex gap-2">
                       {project.isProtected && <Lock className="w-3 h-3 text-zinc-600" />}
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <button className="text-zinc-600 hover:text-white transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass-panel rounded-none min-w-[140px] bg-black border-zinc-800">
                            <DropdownMenuItem onClick={e => { e.stopPropagation(); setModalState({ type: 'project', mode: 'edit', isOpen: true, data: project }); }} className="text-[10px] uppercase tracking-widest h-9 cursor-pointer text-zinc-400 hover:text-white focus:bg-white/10">
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-900 focus:text-red-500 focus:bg-white/10 text-[10px] uppercase tracking-widest cursor-pointer h-9" onClick={e => { e.stopPropagation(); handleDeleteProject(project); }}>
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
                    <p className="brick-mono text-[10px] text-zinc-500 uppercase tracking-widest line-clamp-2 leading-relaxed">
                      {project.description || "SEM DESCRIÇÃO"}
                    </p>
                  </div>

                  <div className="flex justify-between items-end border-t border-white/5 pt-4 z-10">
                     <span className="brick-mono text-[9px] text-zinc-600 uppercase tracking-widest">
                        {project.subProjects?.length || 0} ÁREAS
                     </span>
                     
                     <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                        <span className="text-[9px] font-bold uppercase text-white tracking-widest">Acessar</span>
                        <ArrowRight className="w-3 h-3 text-white" />
                     </div>
                  </div>
                </PrismaticPanel>
              );
            })}
            
            {/* CARD DE ADICIONAR PROJETO */}
            {hasPermission(currentUser, PERMISSIONS.CREATE_PROJECT) && (
              <PrismaticPanel 
                hoverEffect
                onClick={() => setModalState({ type: 'project', mode: 'create', isOpen: true })}
                className="h-64 flex flex-col items-center justify-center gap-4 border-dashed border-zinc-800 hover:border-zinc-600"
              >
                <div className="w-12 h-12 border border-zinc-800 bg-black/50 flex items-center justify-center group-hover:border-white transition-colors duration-300">
                  <Plus className="w-5 h-5 text-zinc-500 group-hover:text-white" />
                </div>
                <span className="brick-mono text-[10px] font-bold uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400">Iniciar Nova Matriz</span>
              </PrismaticPanel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LegacyHome;
