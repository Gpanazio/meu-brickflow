import React from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBackupTimestamp } from '@/utils/dates';

export default function TrashView({ trashItems, isLoading, error, onRestoreItem, onReturnHome }) {
  const deletedProjects = trashItems?.projects || [];
  const deletedSubProjects = trashItems?.subProjects || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">Lixeira</h1>
          <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest mt-2">
            Itens excluídos ficam aqui até a restauração.
          </p>
        </div>
        <Button variant="outline" onClick={onReturnHome} className="border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-none h-8 px-3 uppercase text-[10px] tracking-widest">
          <ArrowLeft className="mr-2 h-3 w-3" /> Voltar
        </Button>
      </div>

      {error && (
        <div className="border border-red-900/60 bg-red-950/40 p-4 text-[10px] text-red-400 font-mono uppercase tracking-widest">
          Erro ao carregar lixeira.
        </div>
      )}

      {isLoading && (
        <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
          Carregando itens deletados...
        </div>
      )}

      {!isLoading && !error && deletedProjects.length === 0 && deletedSubProjects.length === 0 && (
        <div className="border border-zinc-900 bg-black/60 p-6 text-center">
          <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">Nenhum item na lixeira.</p>
        </div>
      )}

      {/* Renderização de Projetos */}
      {!isLoading && deletedProjects.length > 0 && (
        <div className="border border-zinc-900 bg-black/60 p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Projetos ({deletedProjects.length})</h2>
          <div className="space-y-3">
            {deletedProjects.map(project => (
              <div key={project.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-zinc-900 p-4 bg-black/80">
                <div className="space-y-1">
                  <p className="text-sm font-bold uppercase tracking-widest text-zinc-200">{project.name}</p>
                  <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">Excluído em {formatBackupTimestamp(project.deleted_at)}</p>
                </div>
                <Button variant="outline" className="h-8 px-3 uppercase text-[10px] tracking-widest" onClick={() => onRestoreItem({ type: 'project', id: project.id })}>
                  <RotateCcw className="mr-2 h-3 w-3" /> Restaurar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Renderização de SubProjetos */}
      {!isLoading && deletedSubProjects.length > 0 && (
        <div className="border border-zinc-900 bg-black/60 p-6 space-y-4">
           <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Áreas ({deletedSubProjects.length})</h2>
          <div className="space-y-3">
            {deletedSubProjects.map(subProject => (
              <div key={subProject.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-zinc-900 p-4 bg-black/80">
                <div className="space-y-1">
                  <p className="text-sm font-bold uppercase tracking-widest text-zinc-200">{subProject.name}</p>
                  <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">Excluído em {formatBackupTimestamp(subProject.deleted_at)}</p>
                </div>
                <Button variant="outline" className="h-8 px-3 uppercase text-[10px] tracking-widest" onClick={() => onRestoreItem({ type: 'subProject', id: subProject.id, projectId: subProject.parentProjectId })}>
                  <RotateCcw className="mr-2 h-3 w-3" /> Restaurar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
