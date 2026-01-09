import React, { useMemo } from 'react';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Plus, MoreVertical, Lock, Sparkles, Dna } from 'lucide-react';
import SudokuGame from '../SudokuGame';

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
  handleDeleteProject
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

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      
      {/* SECTION: HERO (OLÁ GABRIEL) */}
      <div className="pt-12 pb-12 border-b border-zinc-900 px-8">
         <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.8]">
           Olá, <span className="text-zinc-800">{currentUser?.displayName || 'Visitante'}</span>
         </h1>
         <p className="mt-6 text-[10px] text-zinc-600 font-mono tracking-[0.2em] uppercase">
           {currentDate}
         </p>
      </div>

      {/* SECTION: WIDGETS (FAIXA HORIZONTAL COMPACTA) */}
      {/* Altura fixa em lg:h-48 força o aspecto "widescreen" */}
      <div className="border-b border-zinc-900 bg-black">
        <div className="flex flex-col lg:flex-row h-auto lg:h-48 divide-y lg:divide-y-0 lg:divide-x divide-zinc-900">
            
            {/* WIDGET 1: SORTE DO DIA (Expandido) */}
            <div className="flex-1 p-8 flex flex-col justify-between">
                <div className="flex items-center gap-3">
                    <Sparkles className="w-3 h-3 text-red-600" />
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.2em]">Sorte do Dia</span>
                </div>
                
                <div className="max-w-3xl mt-2">
                    {/* Texto com tamanho contido */}
                    <p className="text-xl md:text-2xl text-zinc-300 font-medium italic leading-relaxed tracking-tight">
                    "{dailyPhrase || "O silêncio é uma resposta."}"
                    </p>
                </div>
                <div /> {/* Spacer */}
            </div>

            {/* WIDGET 2: PROBABILIDADE (Compacto e Horizontal) */}
            <div className="w-full lg:w-auto p-8 flex flex-col justify-between bg-black lg:min-w-[420px]">
                <div className="flex items-center gap-3 mb-4">
                    <Dna className="w-3 h-3 text-emerald-600" />
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.2em]">Probabilidade</span>
                </div>
                
                {/* Números em LINHA ÚNICA e QUADRADOS PEQUENOS */}
                <div className="flex flex-row gap-3">
                    {safeMegaSena.map((n, i) => (
                        <div key={i} className="w-10 h-10 flex items-center justify-center border border-zinc-800 text-zinc-400 font-mono text-[10px] hover:border-emerald-900 hover:text-emerald-500 transition-colors cursor-default">
                            {n.toString().padStart(2, '0')}
                        </div>
                    ))}
                </div>
                <div /> {/* Spacer */}
            </div>
        </div>
      </div>

      {/* SUDOKU (Apenas Fran) */}
      {currentUser?.displayName === 'Fran' && (
        <div className="border-b border-zinc-900 p-8 bg-zinc-950/30">
           <SudokuGame />
        </div>
      )}

      {/* SECTION: PROJETOS */}
      <div className="px-8 mt-12">
        <div className="flex justify-between items-end mb-6 border-b border-zinc-900 pb-4">
          <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Projetos Ativos</h2>
          
          <Button 
            onClick={() => setModalState({ type: 'project', mode: 'create', isOpen: true })} 
            className="bg-white text-black hover:bg-zinc-200 h-8 px-6 text-[10px] uppercase font-black tracking-[0.2em] rounded-none transition-transform active:scale-95"
          >
            <Plus className="mr-2 h-3 w-3" /> Novo
          </Button>
        </div>

        {/* Lista de Projetos */}
        {activeProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 opacity-20 select-none">
            <h1 className="text-6xl md:text-8xl font-black text-zinc-800 uppercase tracking-tighter">VAZIO</h1>
            <p className="text-zinc-600 text-xs font-mono mt-4 uppercase tracking-widest">Nenhum projeto iniciado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-900 border border-zinc-900">
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
                  className="group relative aspect-video bg-black hover:bg-zinc-950 transition-all cursor-pointer p-8 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start w-full">
                    <div className={`w-1.5 h-1.5 ${colors.bg}`}></div>
                    {project.isProtected && <Lock className="w-3 h-3 text-zinc-800" />}
                  </div>

                  <div className="space-y-4 relative z-10 pr-4">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none group-hover:translate-x-1 transition-transform">
                      {project.name}
                    </h3>
                    <p className="text-zinc-600 text-[10px] font-mono leading-relaxed line-clamp-2 uppercase tracking-wide">
                      {project.description || "SEM DESCRIÇÃO"}
                    </p>
                  </div>

                  <div className="flex justify-between items-end opacity-60 group-hover:opacity-100 transition-opacity">
                     <span className="text-[9px] text-zinc-700 font-mono uppercase tracking-widest">
                        {project.subProjects?.length || 0} ÁREAS
                     </span>
                     
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-800 hover:text-white hover:bg-zinc-900 rounded-none transition-colors">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-black border-zinc-800 rounded-none min-w-[140px]">
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); setModalState({ type: 'project', mode: 'edit', isOpen: true, data: project }); }} className="text-[10px] uppercase tracking-widest h-9 cursor-pointer text-zinc-400 hover:text-white hover:bg-zinc-900">
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-900 focus:text-red-500 focus:bg-zinc-900 text-[10px] uppercase tracking-widest cursor-pointer h-9" onClick={e => { e.stopPropagation(); handleDeleteProject(project); }}>
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default LegacyHome;
