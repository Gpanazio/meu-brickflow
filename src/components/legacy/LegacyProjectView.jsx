import { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { CardTitle } from '../ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { ArrowLeft, Plus, FolderOpen, MoreVertical, Lock, History, ChevronDown, GripVertical } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import MechButton from '../ui/MechButton';
import { motion, AnimatePresence } from 'framer-motion';

function LegacyProjectView({
  currentProject,
  setCurrentView,
  setModalState,
  handleAccessProject,
  handleDeleteProject,
  handleDragStart,
  handleDragOver,
  handleDrop,
  COLOR_VARIANTS,
  history,
  isHistoryLoading,
  historyError,
  onRestoreEvent,
  users
}) {
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

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
          <MechButton 
            onClick={() => setCurrentView('home')} 
            icon={ArrowLeft}
            className="h-10 px-4"
          >
            Voltar
          </MechButton>
        </div>
        <div className="border border-zinc-900 bg-black/60 p-6 text-center">
          <h2 className="text-lg font-bold text-white uppercase tracking-widest">Projeto indisponível</h2>
          <p className="mt-2 text-xs text-zinc-500 font-mono uppercase tracking-widest">Selecione um projeto válido para continuar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20 relative overflow-hidden min-h-screen">
      {/* Grid de Fundo (Abismo) - Replicado da Home */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"
          style={{ filter: 'contrast(150%) brightness(100%)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, #888 1px, transparent 1px),
              linear-gradient(to bottom, #888 1px, transparent 1px)`,
            backgroundSize: '4rem 4rem',
            maskImage: 'radial-gradient(circle at center, black, transparent 80%)'
          }}
        />
      </div>

      <div className="relative z-10 space-y-8">
        <div className="flex flex-col gap-6 border-b border-white/10 pb-6">
          <div className="flex justify-between items-center">
            <MechButton 
              onClick={() => setCurrentView('home')} 
              icon={ArrowLeft}
              className="h-10 px-4"
            >
              Voltar
            </MechButton>
            <Button onClick={() => setModalState({ type: 'subProject', mode: 'create', isOpen: true })} className="bg-white hover:bg-zinc-200 text-black rounded-none uppercase text-xs font-bold tracking-widest h-10 px-6 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.2)]"><Plus className="mr-2 h-4 w-4" /> Nova Área</Button>
          </div>

          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              {currentProject.name}
              {currentProject.isProtected && <Lock className="h-6 w-6 text-zinc-800" />}
            </h1>
            <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mt-2">{currentProject.description}</p>
          </div>
        </div>

        <Collapsible>
          <CollapsibleTrigger className="w-full">
            <div className="glass-panel p-4 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
                <History className="h-4 w-4" /> Histórico
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-zinc-600 font-mono uppercase tracking-widest">
                  {isHistoryLoading ? 'Carregando...' : `${history?.length || 0} eventos`}
                </span>
                <ChevronDown className="h-4 w-4 text-zinc-600" />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="glass-panel p-6 space-y-4 mt-2">
              {historyError && (
                <div className="text-xs text-red-500 font-mono uppercase tracking-widest">Erro ao carregar histórico.</div>
              )}

              {!historyError && !isHistoryLoading && (!history || history.length === 0) && (
                <div className="text-xs text-zinc-600 font-mono uppercase tracking-widest">Nenhuma alteração registrada.</div>
              )}

              {!historyError && history && history.length > 0 && (
                <div className="space-y-3">
                  {history.map(event => (
                    <div key={event.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-white/10 p-4 bg-black/20">
                      <div className="space-y-1">
                        <div className="text-xs uppercase tracking-widest text-zinc-300 font-bold">
                          {formatAction(event.action_type)}
                        </div>
                        <div className="text-xs text-zinc-600 font-mono uppercase tracking-widest">
                          {usersMap.get(event.user_id) || event.user_id || 'Sistema'} • {formatTimestamp(event.timestamp)}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-none h-10 px-4 uppercase text-xs tracking-widest"
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
          <AnimatePresence mode="popLayout">
            {activeSubProjects.map(sub => {
              // Safety check for color variant with fallback
              const colors = COLOR_VARIANTS[sub.color] || COLOR_VARIANTS['zinc'] || COLOR_VARIANTS['blue'];

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={sub.id} 
                  draggable
                  onDragStart={(e) => {
                    handleDragStart(e, sub, 'subproject');
                    setDraggingId(sub.id);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDragOverId(null);
                  }}
                  onDragOver={(e) => {
                    handleDragOver(e);
                    setDragOverId(sub.id);
                  }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => {
                    handleDrop(e, sub.id, 'subproject');
                    setDraggingId(null);
                    setDragOverId(null);
                  }}
                  onClick={() => handleAccessProject(sub, 'subproject')} 
                  className={`group cursor-pointer glass-panel hover:bg-white/5 transition-all p-6 flex flex-col justify-between h-48 relative ${draggingId === sub.id ? 'opacity-40 grayscale' : ''} ${dragOverId === sub.id && draggingId !== sub.id ? 'border-red-600/50 bg-white/5' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" />
                      <FolderOpen className={`h-5 w-5 ${colors.text} opacity-50 group-hover:opacity-100 transition-opacity`} />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white rounded-none"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-panel rounded-none">
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); setModalState({ type: 'subProject', mode: 'edit', isOpen: true, data: sub }); }} className="text-[10px] uppercase tracking-widest h-8 cursor-pointer text-zinc-400 hover:text-white hover:bg-white/10">Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-900 focus:text-red-600 focus:bg-white/10 text-[10px] uppercase tracking-widest h-8 cursor-pointer glitch-hover" onClick={e => { e.stopPropagation(); handleDeleteProject(sub, true); }}>Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div>
                    <CardTitle className="text-xl font-bold uppercase tracking-tight text-white mb-1">{sub.name}</CardTitle>
                    <span className="text-zinc-500 text-sm font-mono uppercase tracking-widest line-clamp-1">{sub.description || "---"}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div
            onClick={() => setModalState({ type: 'subProject', mode: 'create', isOpen: true })}
            className="glass-panel flex flex-col items-center justify-center cursor-pointer group hover:bg-white/5 transition-colors h-48 border-dashed border-zinc-800"
          >
            <Plus className="h-6 w-6 text-zinc-600 group-hover:text-zinc-400 mb-2 transition-colors" />
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400">NOVA ÁREA</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LegacyProjectView;
