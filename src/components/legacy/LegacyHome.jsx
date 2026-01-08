import React, { useMemo } from 'react';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Plus, MoreVertical, Lock, Sparkles, Dna } from 'lucide-react';
import SudokuGame from '../SudokuGame';

// Cores definidas internamente para evitar quebras se a prop falhar
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
  // Blindagem contra dados inválidos
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeMegaSena = Array.isArray(megaSenaNumbers) ? megaSenaNumbers : [0,0,0,0,0,0];

  const currentDate = useMemo(() => {
    return new Date().toLocaleDateString('pt-BR', { 
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
    });
  }, []);

  const activeProjects = useMemo(() => {
    return safeProjects.filter(p => !p.isArchived);
  }, [safeProjects]);

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER */}
      <div className="border-b border-zinc-900 pb-8">
         <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-2">
           Olá, <span className="text-zinc-700">{currentUser?.displayName || 'Visitante'}</span>
         </h1>
         <p className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase">
           {currentDate}
         </p>
      </div>

      {/* DASHBOARD WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-900 border border-zinc-900">
        <div className="md:col-span-2 bg-black p-8 flex flex-col justify-between min-h-[160px] group hover:bg-zinc-950/30 transition-colors">
           <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-3 h-3 text-red-600" />
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Sorte do Dia</span>
           </div>
           <p className="text-lg md:text-xl text-zinc-300 font-light italic leading-relaxed">
             "{dailyPhrase || "O silêncio é uma resposta."}"
           </p>
        </div>

        <div className="bg-black p-8 flex flex-col justify-between min-h-[160px] group hover:bg-zinc-950/30 transition-colors">
           <div className="flex items-center gap-2 mb-4">
              <Dna className="w-3 h-3 text-emerald-600" />
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Probabilidade</span>
           </div>
           <div className="grid grid-cols-3 gap-2">
              {safeMegaSena.map((n, i) => (
                <div key={i} className="aspect-square flex items-center justify-center border border-zinc-800 text-zinc-400 font-mono text-xs cursor-default hover:text-emerald-500 hover:border-emerald-900 transition-colors">
                  {n.toString().padStart(2, '0')}
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* SUDOKU (APENAS PARA FRAN) */}
      {currentUser?.displayName === 'Fran' && (
        <div className="border border-zinc-800 p-4 bg-zinc-950/30">
           <SudokuGame />
        </div>
      )}

      {/* LISTA DE PROJETOS */}
      <div className="space-y-4">
        <div className="flex justify-between items-end pb-2 border-b border-zinc-900">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">Projetos Ativos</h2>
          {/* Botão Novo com classe 'bg-white text-black' explícita para garantir contraste */}
          <Button onClick={() => setModalState({ type: 'project', mode: 'create', isOpen: true })} className="bg-white text-black hover:bg-zinc-200 h-8 px-4 text-[10px] uppercase font-bold tracking-widest rounded-none mb-2">
            <Plus className="mr-1 h-3 w-3" /> Novo
          </Button>
        </div>

        {safeProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 opacity-30">
            <h1 className="text-4xl font-black text-zinc-800 uppercase tracking-tighter">VAZIO</h1>
            <p className="text-zinc-600 text-xs font-mono mt-2">Nenhum projeto encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-l border-zinc-900">
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
                  className="group relative aspect-video border-r border-b border-zinc-900 bg-black hover:bg-zinc-950 transition-all cursor-pointer p-6 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start w-full">
                    <div className={`w-2 h-2 ${colors.bg}`}></div>
                    {project.isProtected && <Lock className="w-3 h-3 text-zinc-800" />}
                  </div>

                  <div className="space-y-2 relative z-10">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none group-hover:translate-x-1 transition-transform">
                      {project.name}
                    </h3>
                    <p className="text-zinc-600 text-[10px] font-mono leading-tight line-clamp-2">
                      {project.description || "SEM DESCRIÇÃO"}
                    </p>
                  </div>

                  <div className="flex justify-between items-end opacity-40 group-hover:opacity-100 transition-opacity">
                     <span className="text-[9px] text-zinc-700 font-mono uppercase tracking-widest">{project.subProjects?.length || 0} ÁREAS</span>
                     
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-800 hover:text-white rounded-none">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-black border-zinc-800 rounded-none">
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); setModalState({ type: 'project', mode: 'edit', isOpen: true, data: project }); }} className="text-[10px] uppercase tracking-widest h-8 cursor-pointer text-zinc-300 hover:text-white hover:bg-zinc-900">Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-900 focus:text-red-600 focus:bg-zinc-900 text-[10px] uppercase tracking-widest cursor-pointer h-8" onClick={e => { e.stopPropagation(); handleDeleteProject(project); }}>Eliminar</DropdownMenuItem>
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
