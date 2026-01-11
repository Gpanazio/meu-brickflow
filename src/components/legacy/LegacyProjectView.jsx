import React, { useMemo } from 'react';
import { Button } from '../ui/button';
import { CardTitle } from '../ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { ArrowLeft, Plus, FolderOpen, MoreVertical, Lock, History, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

function LegacyProjectView({
  currentProject,
  setCurrentView,
  setModalState,
  handleAccessProject,
  handleDeleteProject,
  COLOR_VARIANTS,
  history,
  isHistoryLoading,
  historyError,
  onRestoreEvent,
  users
}) {
  // CORREÇÃO ERRO #310: Hook elevado para o Top-Level
  const activeSubProjects = useMemo(() => {
    return currentProject?.subProjects?.filter(s => !s.isArchived && !s.deleted_at) || [];
  }, [currentProject]);

  const usersMap = useMemo(() => {
    return new Map((users || []).map(user => [user.username, user.displayName || user.username]));
  }, [users]);

  const formatTimestamp = (value) => {
    if (!value) return 'Sem data';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Data inválida';
    return date.toLocaleString('pt-BR');
  };

  const formatAction = (action) => {
    switch (action) {
      case 'create':
        return 'Criado';
      case 'update':
        return 'Atualizado';
      case 'delete':
        return 'Excluído';
      case 'restore':
        return 'Restaurado';
      default:
        return action || 'Alterado';
    }
  };

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
      <div className="flex flex-col gap-6 border-b border-white/10 pb-6">
        <div className="flex justify-between items-center">
           <Button variant="outline" onClick={() => setCurrentView('home')} className="border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-500 hover:text-white rounded-none h-8 px-3 uppercase text-[10px] tracking-widest cursor-pointer"><ArrowLeft className="mr-2 h-3 w-3" /> Voltar</Button>
           <Button onClick={() => setModalState({ type: 'subProject', mode: 'create', isOpen: true })} className="bg-white hover:bg-zinc-200 text-black rounded-none uppercase text-xs font-bold tracking-widest h-10 px-6 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.2)]"><Plus className="mr-2 h-4 w-4" /> Nova Área</Button>
        </div>
        
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            {currentProject.name} 
            {currentProject.isProtected && <Lock className="h-6 w-6 text-zinc-800"/>}
          </h1>
          <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest mt-2">{currentProject.description}</p>
        </div>
      </div>
      
      <Collapsible>
        <CollapsibleTrigger className="w-full">
          <div className="glass-panel p-4 flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
              <History className="h-4 w-4" /> Histórico
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                {isHistoryLoading ? 'Carregando...' : `${history?.length || 0} eventos`}
              </span>
              <ChevronDown className="h-4 w-4 text-zinc-600" />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="glass-panel p-6 space-y-4 mt-2">
            {historyError && (
              <div className="text-[10px] text-red-500 font-mono uppercase tracking-widest">Erro ao carregar histórico.</div>
            )}

            {!historyError && !isHistoryLoading && (!history || history.length === 0) && (
              <div className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">Nenhuma alteração registrada.</div>
            )}

            {!historyError && history && history.length > 0 && (
              <div className="space-y-3">
                {history.map(event => (
                  <div key={event.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-white/10 p-4 bg-black/20">
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-widest text-zinc-300 font-bold">
                        {formatAction(event.action_type)}
                      </div>
                      <div className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                        {usersMap.get(event.user_id) || event.user_id || 'Sistema'} • {formatTimestamp(event.timestamp)}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-none h-8 px-3 uppercase text-[10px] tracking-widest"
                      onClick={() => onRestoreEvent && onRestoreEvent(event.id)}
                    >
                      Restaurar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeSubProjects.map(sub => {
          // Safety check for color variant with fallback
          const colors = COLOR_VARIANTS[sub.color] || COLOR_VARIANTS['zinc'] || COLOR_VARIANTS['blue'];
          
          return (
            <div key={sub.id} onClick={() => handleAccessProject(sub, 'subproject')} className="group cursor-pointer glass-panel hover:bg-white/5 transition-colors p-6 flex flex-col justify-between h-48">
              <div className="flex justify-between items-start">
                 <FolderOpen className={`h-5 w-5 ${colors.text} opacity-50 group-hover:opacity-100 transition-opacity`} />
                 <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white rounded-none"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-panel rounded-none">
                    <DropdownMenuItem onClick={e => { e.stopPropagation(); setModalState({ type: 'subProject', mode: 'edit', isOpen: true, data: sub }); }} className="text-[10px] uppercase tracking-widest h-8 cursor-pointer text-zinc-400 hover:text-white hover:bg-white/10">Editar</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-900 focus:text-red-600 focus:bg-white/10 text-[10px] uppercase tracking-widest h-8 cursor-pointer" onClick={e => { e.stopPropagation(); handleDeleteProject(sub, true); }}>Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div>
                 <CardTitle className="text-lg font-bold uppercase tracking-tight text-white mb-1">{sub.name}</CardTitle>
                 <span className="text-zinc-500 text-[9px] font-mono uppercase tracking-widest line-clamp-1">{sub.description || "---"}</span>
              </div>
            </div>
          );
        })}
        <div 
          onClick={() => setModalState({ type: 'subProject', mode: 'create', isOpen: true })}
          className="glass-panel flex flex-col items-center justify-center cursor-pointer group hover:bg-white/5 transition-colors h-48"
        >
          <Plus className="h-6 w-6 text-zinc-600 group-hover:text-zinc-400 mb-2 transition-colors" />
          <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400">Adicionar</span>
        </div>
      </div>
    </div>
  );
}

export default LegacyProjectView;
