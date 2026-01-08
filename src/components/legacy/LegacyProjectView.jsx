import React, { useMemo } from 'react';
import { Button } from '../ui/button';
import { CardTitle } from '../ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { ArrowLeft, Plus, FolderOpen, MoreVertical, Lock } from 'lucide-react';

function LegacyProjectView({
  currentProject,
  setCurrentView,
  setModalState,
  handleAccessProject,
  handleDeleteProject,
  COLOR_VARIANTS
}) {
  // CORREÇÃO ERRO #310: Hook elevado para o Top-Level
  const activeSubProjects = useMemo(() => {
    return currentProject?.subProjects?.filter(s => !s.isArchived) || [];
  }, [currentProject]);

  if (!currentProject) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setCurrentView('home')} className="border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-500 hover:text-white rounded-none h-8 px-3 uppercase text-[10px] tracking-widest">
            <ArrowLeft className="mr-2 h-3 w-3" /> Voltar
          </Button>
        </div>
        <div className="border border-zinc-900 bg-black/60 p-6 text-center">
          <h2 className="text-lg font-bold text-white uppercase tracking-widest">Projeto indisponível</h2>
          <p className="mt-2 text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Selecione um projeto válido para continuar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col gap-6 border-b border-zinc-900 pb-6">
        <div className="flex justify-between items-center">
           <Button variant="outline" onClick={() => setCurrentView('home')} className="border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-500 hover:text-white rounded-none h-8 px-3 uppercase text-[10px] tracking-widest"><ArrowLeft className="mr-2 h-3 w-3" /> Voltar</Button>
           <Button onClick={() => setModalState({ type: 'subProject', mode: 'create', isOpen: true })} className="bg-white hover:bg-zinc-200 text-black rounded-none uppercase text-[10px] font-bold tracking-widest h-8 px-4"><Plus className="mr-2 h-3 w-3" /> Nova Área</Button>
        </div>
        
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            {currentProject.name} 
            {currentProject.isProtected && <Lock className="h-6 w-6 text-zinc-800"/>}
          </h1>
          <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest mt-2">{currentProject.description}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-900 border border-zinc-900">
        {activeSubProjects.map(sub => {
          // Safety check for color variant with fallback
          const colors = COLOR_VARIANTS[sub.color] || COLOR_VARIANTS['zinc'] || COLOR_VARIANTS['blue'];
          
          return (
            <div key={sub.id} onClick={() => handleAccessProject(sub, 'subproject')} className="group cursor-pointer bg-black hover:bg-zinc-950 transition-colors p-6 flex flex-col justify-between h-48">
              <div className="flex justify-between items-start">
                 <FolderOpen className={`h-5 w-5 ${colors.text} opacity-50 group-hover:opacity-100 transition-opacity`} />
                 <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-800 hover:text-white rounded-none"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-black border-zinc-800 rounded-none">
                    <DropdownMenuItem onClick={e => { e.stopPropagation(); setModalState({ type: 'subProject', mode: 'edit', isOpen: true, data: sub }); }} className="text-[10px] uppercase tracking-widest h-8 cursor-pointer">Editar</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-900 focus:text-red-600 text-[10px] uppercase tracking-widest h-8 cursor-pointer" onClick={e => { e.stopPropagation(); handleDeleteProject(sub, true); }}>Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div>
                 <CardTitle className="text-lg font-bold uppercase tracking-tight text-white mb-1">{sub.name}</CardTitle>
                 <span className="text-zinc-600 text-[9px] font-mono uppercase tracking-widest line-clamp-1">{sub.description || "---"}</span>
              </div>
            </div>
          );
        })}
        <div 
          onClick={() => setModalState({ type: 'subProject', mode: 'create', isOpen: true })}
          className="bg-black flex flex-col items-center justify-center cursor-pointer group hover:bg-zinc-900/30 transition-colors h-48"
        >
          <Plus className="h-6 w-6 text-zinc-800 group-hover:text-zinc-500 mb-2 transition-colors" />
          <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-800 group-hover:text-zinc-500">Adicionar</span>
        </div>
      </div>
    </div>
  );
}

export default LegacyProjectView;
