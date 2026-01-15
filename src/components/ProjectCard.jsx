import React from 'react';
import PropTypes from 'prop-types';
import { Lock, ArrowRight, FolderOpen } from 'lucide-react';
import PrismaticPanel from '@/components/ui/PrismaticPanel';
import StatusLED from '@/components/ui/StatusLED';
import { cn } from '@/lib/utils';

export default function ProjectCard({ project, onSelect, className, ...props }) {
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(project);
    }
  };

  // Contagem de subprojetos/áreas para exibição de metadados
  const subProjectCount = project.subProjects?.length || 0;

  return (
    <PrismaticPanel
      hoverEffect
      onClick={() => onSelect(project)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className={cn("h-64 active:scale-[0.98] transition-transform outline-none focus-visible:ring-2 focus-visible:ring-white/20", className)}
      contentClassName="p-8 flex flex-col justify-between"
      {...props}
    >
      {/* Header */}
      <div className="flex justify-between items-start z-10 pointer-events-none">
        <StatusLED color={project.color || 'zinc'} size="md" />

        {project.isProtected && (
          <div className="flex items-center gap-2 bg-black/40 px-2 py-1 border border-zinc-800 rounded-sm">
            <Lock className="w-3 h-3 text-zinc-500" />
            <span className="brick-mono text-[9px] text-zinc-500 uppercase tracking-widest">LOCKED</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="space-y-4 z-10 relative pointer-events-none">
        <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-[0.85] group-hover:translate-x-1 transition-transform duration-300 drop-shadow-xl font-brick-title">
          {project.name}
        </h3>
        <p className="brick-mono text-xs text-zinc-500 uppercase tracking-widest line-clamp-2 leading-relaxed font-medium min-h-[2.5em]">
          {project.description || "SEM DESCRIÇÃO"}
        </p>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-end border-t border-white/5 pt-4 z-10 pointer-events-none">
        <div className="flex items-center gap-2 text-zinc-600">
          <FolderOpen className="w-3 h-3" />
          <span className="brick-mono text-xs uppercase tracking-widest font-medium">
            {subProjectCount} {subProjectCount === 1 ? 'ÁREA' : 'ÁREAS'}
          </span>
        </div>

        {/* Efeito de Slide no Hover */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
          <span className="text-xs font-bold uppercase text-white tracking-widest brick-title">Acessar</span>
          <ArrowRight className="w-3 h-3 text-white" />
        </div>
      </div>
    </PrismaticPanel>
  );
}

ProjectCard.propTypes = {
  project: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    color: PropTypes.string,
    isProtected: PropTypes.bool,
    subProjects: PropTypes.array,
  }).isRequired,
  onSelect: PropTypes.func.isRequired,
  className: PropTypes.string,
};