import React, { useMemo } from 'react';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Plus, MoreVertical, Lock, Sparkles, Dna, CheckSquare, ChevronRight } from 'lucide-react';
import SudokuGame from '../SudokuGame';
import { getUserTasks } from '../../utils/userTasks';
import { hasPermission, PERMISSIONS } from '../../utils/accessControl';

// Cores definidas internamente para blindagem visual
const DEFAULT_COLORS = {
  blue: { bg: 'bg-blue-600', text: 'text-blue-500' },
  red: { bg: 'bg-red-600', text: 'text-red-500' },
  green: { bg: 'bg-green-600', text: 'text-green-500' },
  purple: { bg: 'bg-purple-600', text: 'text-purple-500' },
  orange: { bg: 'bg-orange-600', text: 'text-orange-500' },
  zinc: { bg: 'bg-zinc-600', text: 'text-zinc-500' }
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
    <div className="min-h-screen bg-black text-white pb-20">
      
      {/* --- SEÇÃO SUPERIOR UNIFICADA (HERO + WIDGETS) --- */}
      {/* Altura compacta h-40 (160px) */}
      <div className="glass-panel mx-6 md:mx-10 mt-6 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-white/10 lg:h-40">

        {/* COLUNA 1: HERO (OLÁ GABRIEL) - 50% da largura */}
        <div className="lg:w-1/2 px-6 md:px-10 py-6 flex flex-col justify-center">
           {/* Texto ajustado para altura compacta */}
           <h1 className="brick-title text-4xl md:text-6xl uppercase leading-[0.85]">
             Olá, <span className="text-zinc-800">{currentUser?.displayName || 'Visitante'}</span>
           </h1>
           <p className="brick-tech mt-4 text-[10px] text-zinc-600 tracking-[0.2em] uppercase">
             {currentDate}
           </p>
        </div>

        {/* COLUNA 2: WIDGET SORTE - 25% da largura */}
        <div className="lg:w-1/4 px-6 md:px-10 py-6 flex flex-col justify-between">
            <div className="flex items-center gap-3">
                <Sparkles className="w-3 h-3 text-red-600" />
                <span className="brick-tech text-[9px] text-zinc-500 uppercase tracking-[0.2em]">Sorte do Dia</span>
            </div>

            <div className="flex-1 flex items-center mt-3 lg:mt-0">
                <p className="brick-manifesto text-base text-zinc-300 italic leading-relaxed tracking-tight">
                "{dailyPhrase || "O silêncio é uma resposta."}"
                </p>
            </div>
        </div>

        {/* COLUNA 3: WIDGET PROBABILIDADE - 25% da largura */}
        <div className="lg:w-1/4 px-6 md:px-10 py-6 flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4 lg:mb-0">
                <Dna className="w-3 h-3 text-emerald-600" />
                <span className="brick-tech text-[9px] text-zinc-500 uppercase tracking-[0.2em]">Probabilidade</span>
            </div>

            <div className="flex-1 flex items-center">
                {/* Números em linha única */}
                <div className="flex gap-2 w-full justify-between">
                    {safeMegaSena.map((n, i) => (
                        <div key={i} className="brick-tech flex-1 aspect-square flex items-center justify-center border border-white/10 bg-black/20 text-zinc-500 text-xs hover:border-emerald-900 hover:text-emerald-500 transition-colors cursor-default">
                            {n.toString().padStart(2, '0')}
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* SUDOKU (Apenas Fran) */}
      {currentUser?.displayName === 'Fran' && (
        <div className="glass-panel mx-6 md:mx-10 mt-6 p-8">
           <SudokuGame />
        </div>
      )}

      {/* SECTION: MINHAS TAREFAS */}
      <div className="glass-panel mx-6 md:mx-10 mt-6">
        <div className="px-6 md:px-10 py-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckSquare className="w-4 h-4 text-red-600" />
            <h2 className="brick-tech text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
              Minhas Tarefas
            </h2>
            <span className="brick-tech text-[9px] text-zinc-700 uppercase tracking-widest">
              ({userTasks.length})
            </span>
          </div>

          {userTasks.length > 0 ? (
            <>
              <div className="space-y-2">
                {userTasks.slice(0, 5).map((task) => {
                  const colors = DEFAULT_COLORS[task.projectColor] || DEFAULT_COLORS['blue'];

                  return (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick && onTaskClick(task)}
                      className="group flex items-center justify-between bg-black hover:bg-zinc-950 border border-zinc-900 hover:border-zinc-800 transition-all cursor-pointer p-4"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`w-1 h-8 ${colors.bg} flex-shrink-0`}></div>

                        <div className="flex-1 min-w-0">
                          <h3 className="brick-manifesto text-sm text-white uppercase tracking-wide truncate">
                            {task.title}
                          </h3>
                          <p className="brick-tech text-[9px] text-zinc-600 uppercase tracking-widest mt-1">
                            {task.projectName} / {task.subProjectName}
                          </p>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-zinc-800 group-hover:text-zinc-600 transition-colors flex-shrink-0" />
                    </div>
                  );
                })}
              </div>

              {userTasks.length > 5 && (
                <p className="brick-tech text-[9px] text-zinc-700 uppercase tracking-widest mt-4 text-center">
                  + {userTasks.length - 5} tarefas adicionais
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="brick-manifesto text-2xl text-zinc-800 uppercase tracking-tight mb-2">
                Tá molezinha demais! 😎
              </p>
              <p className="brick-tech text-[9px] text-zinc-600 uppercase tracking-widest">
                Nenhuma tarefa atribuída... por enquanto
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SECTION: PROJETOS */}
      <div className="px-8 mt-12">
        <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
          <h2 className="brick-tech text-[10px] text-zinc-400 uppercase tracking-[0.2em]">Projetos Ativos</h2>

          <Button
            onClick={() => setModalState({ type: 'project', mode: 'create', isOpen: true })}
            className="bg-white text-black hover:bg-zinc-200 h-10 px-8 text-xs uppercase font-black tracking-[0.2em] rounded-none transition-transform active:scale-95 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Projeto
          </Button>
        </div>

        {/* Lista de Projetos */}
        {activeProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <h1 className="text-6xl md:text-8xl font-black text-white/10 uppercase tracking-tighter select-none">VAZIO</h1>
            <p className="text-zinc-500 text-xs font-mono mt-4 uppercase tracking-widest mb-8">Nenhum projeto iniciado</p>
            {hasPermission(currentUser, PERMISSIONS.CREATE_PROJECT) && (
              <Button
                onClick={() => setModalState({ type: 'project', mode: 'create', isOpen: true })}
                className="bg-white text-black hover:bg-zinc-200 h-12 px-10 text-xs uppercase font-black tracking-[0.2em] rounded-none transition-transform active:scale-95 cursor-pointer shadow-[0_0_30px_rgba(255,255,255,0.15)]"
              >
                <Plus className="mr-2 h-4 w-4" /> Criar Primeiro Projeto
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeProjects.map(project => {
              const colors = DEFAULT_COLORS[project.color] || DEFAULT_COLORS['blue'];
              
              return (
                <div 
                  key={project.id} 
                  draggable={true}
                  onDragStart={(e) => handleDragStart && handleDragStart(e, project, 'project')}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop && handleDrop(e, project.id, 'project')}
                  onClick={() => handleAccessProject(project)} 
                  className="group relative aspect-video glass-panel hover:bg-white/5 transition-all cursor-pointer p-8 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start w-full">
                    <div className={`w-2 h-2 ${colors.bg} shadow-[0_0_10px_currentColor]`}></div>
                    {project.isProtected && <Lock className="w-3 h-3 text-zinc-600" />}
                  </div>

                  <div className="space-y-4 relative z-10 pr-4">
                    <h3 className="brick-title text-3xl text-white uppercase leading-none group-hover:translate-x-1 transition-transform drop-shadow-lg">
                      {project.name}
                    </h3>
                    <p className="brick-manifesto text-zinc-400 text-[10px] leading-relaxed line-clamp-2 uppercase tracking-wide">
                      {project.description || "SEM DESCRIÇÃO"}
                    </p>
                  </div>

                  <div className="flex justify-between items-end opacity-60 group-hover:opacity-100 transition-opacity">
                     <span className="brick-tech text-[9px] text-zinc-500 uppercase tracking-widest">
                        {project.subProjects?.length || 0} ÁREAS
                     </span>
                     
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-white/10 rounded-none transition-colors">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-panel rounded-none min-w-[140px]">
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); setModalState({ type: 'project', mode: 'edit', isOpen: true, data: project }); }} className="text-[10px] uppercase tracking-widest h-9 cursor-pointer text-zinc-400 hover:text-white hover:bg-white/10">
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-900 focus:text-red-500 focus:bg-white/10 text-[10px] uppercase tracking-widest cursor-pointer h-9" onClick={e => { e.stopPropagation(); handleDeleteProject(project); }}>
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
                  </div>
                </div>
              );
            })}
            
            {/* CARD DE ADICIONAR PROJETO */}
            {hasPermission(currentUser, PERMISSIONS.CREATE_PROJECT) && (
              <div 
                onClick={() => setModalState({ type: 'project', mode: 'create', isOpen: true })}
                className="group relative aspect-video glass-panel hover:bg-white/5 transition-all cursor-pointer p-8 flex flex-col items-center justify-center gap-4 border-dashed border-white/20 hover:border-white/40"
              >
                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:border-white/40 group-hover:bg-white/5 transition-colors">
                  <Plus className="w-6 h-6 text-zinc-500 group-hover:text-white" />
                </div>
                <span className="brick-tech text-xs text-zinc-500 uppercase tracking-widest group-hover:text-white transition-colors">Criar Novo Projeto</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default LegacyHome;
