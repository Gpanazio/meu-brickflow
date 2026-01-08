import React, { useMemo } from 'react';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Plus, MoreVertical, Lock, Sparkles, Dna } from 'lucide-react';
import SudokuGame from '../SudokuGame';

// Cores definidas internamente para blindagem
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
    // Formata a data para ficar toda em maiúscula e com estilo específico
    return new Date().toLocaleDateString('pt-BR', { 
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
    }).toUpperCase();
  }, []);

  const activeProjects = useMemo(() => {
    return safeProjects.filter(p => !p.isArchived && !p.deleted_at);
  }, [safeProjects]);

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      
      {/* SECTION: BOAS VINDAS */}
      <div className="pt-12 pb-16 border-b border-zinc-900 px-8">
         <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.8]">
           Olá, <span className="text-zinc-800">{currentUser?.displayName || 'Visitante'}</span>
         </h1>
         <p className="mt-6 text-[10px] text-zinc-500 font-mono tracking-[0.2em] uppercase">
           {currentDate}
         </p>
      </div>

      {/* SECTION: WIDGETS (GRID RÍGIDO) */}
      <div className="border-b border-zinc-900">
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-zinc-900 h-auto lg:h-[400px]">
            
            {/* WIDGET 1: SORTE DO DIA (2/3 da largura) */}
            <div className="lg:col-span-2 p-8 lg:p-12 flex flex-col justify-between h-full bg-black">
                <div className="flex items-center gap-3">
                    <Sparkles className="w-3 h-3 text-red-600" />
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.2em]">Sorte do Dia</span>
                </div>
                
                <div className="max-w-2xl">
                    <p className="text-2xl md:text-3xl text-zinc-300 font-medium italic leading-snug tracking-tight">
                    "{dailyPhrase || "O silêncio é uma resposta."}"
                    </p>
                </div>
                
                {/* Espaço vazio para manter alinhamento inferior se necessário */}
                <div />
            </div>

            {/* WIDGET 2: PROBABILIDADE (1/3 da largura) */}
            <div className="p-8 lg:p-12 flex flex-col justify-between h-full bg-black">
                <div className="flex items-center gap-3 mb-8">
                    <Dna className="w-3 h-3 text-emerald-600" />
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.2em]">Probabilidade</span>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                    {safeMegaSena.map((n, i) => (
                        <div key={i} className="aspect-square flex items-center justify-center border border-zinc-800 text-zinc-300 font-mono text-xs hover:border-emerald-900 hover:text-emerald-500 transition-colors">
                            {n.toString().padStart(2, '0')}
                        </div>
                    ))}
                </div>
                
                <div />
            </div>
        </div>
      </div>

      {/* SUDOKU (CONDICIONAL) */}
      {currentUser?.displayName === 'Fran' && (
        <div className="border-b border-zinc-900 p-8 bg-zinc-950/20">
           <SudokuGame />
        </div>
      )}

      {/* SECTION: PROJETOS */}
      <div className="px-8 mt-16">
        {/* Header da Seção de Projetos */}
        <div className="flex justify-between items-end mb-8 border-b border-zinc-900 pb-4">
          <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Projetos Ativos</h2>
          
          <Button 
            onClick={() => setModalState({ type: 'project', mode: 'create', isOpen: true })} 
            className="bg-white text-black hover:bg-zinc-200 h-9 px-6 text-[10px] uppercase font-bold tracking-[0.2em] rounded-none transition-transform active:scale-95"
          >
            <Plus className="mr-2 h-3 w-3" /> Novo
          </Button>
        </div>

        {/* Lista de Projetos */}
        {activeProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-20 select-none">
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
                  className="group relative aspect-[4/3] bg-black hover:bg-zinc-950 transition-all cursor-pointer p-8 flex flex-col justify-between"
                >
                  {/* Topo do Card */}
                  <div className="flex justify-between items-start w-full">
                    <div className={`w-1.5 h-1.5 ${colors.bg}`}></div>
                    {project.isProtected && <Lock className="w-3 h-3 text-zinc-800" />}
                  </div>

                  {/* Corpo do Card */}
                  <div className="space-y-4 relative z-10 pr-4">
                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-[0.9] group-hover:translate-x-1 transition-transform">
                      {project.name}
                    </h3>
                    <p className="text-zinc-600 text-[10px] font-mono leading-relaxed line-clamp-2 uppercase tracking-wide">
                      {project.description || "SEM DESCRIÇÃO"}
                    </p>
                  </div>

                  {/* Rodapé do Card */}
                  <div className="flex justify-between items-end">
                     <span className="text-[9px] text-zinc-800 group-hover:text-zinc-600 font-mono uppercase tracking-widest transition-colors">
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
