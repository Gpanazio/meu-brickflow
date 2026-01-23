import React from 'react';
import PropTypes from 'prop-types';
import { Lock, ArrowRight, FolderOpen, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import StatusLED from '@/components/ui/StatusLED';
import { cn } from '@/lib/utils';

export default function ProjectCard({ project, onSelect, onEdit, onDelete, className, ...props }) {

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(project);
    }
  };

  // Contagem de subprojetos/áreas para exibição de metadados
  const subProjectCount = project.subProjects?.length || 0;

  // Mapping colors to act as glow colors
  const glowColorMap = {
    red: 'rgba(239, 68, 68, 0.4)',
    green: 'rgba(34, 197, 94, 0.4)',
    blue: 'rgba(59, 130, 246, 0.4)',
    yellow: 'rgba(234, 179, 8, 0.4)',
    purple: 'rgba(168, 85, 247, 0.4)',
    pink: 'rgba(236, 72, 153, 0.4)',
    zinc: 'rgba(113, 113, 122, 0.4)',
    orange: 'rgba(249, 115, 22, 0.4)',
    cyan: 'rgba(6, 182, 212, 0.4)',
    lime: 'rgba(132, 204, 22, 0.4)',
    indigo: 'rgba(99, 102, 241, 0.4)',
    rose: 'rgba(244, 63, 94, 0.4)',
  };

  const glowColor = glowColorMap[project.color || 'zinc'];

  return (
    <div
      onClick={() => onSelect(project)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      style={{ '--glow-color': glowColor }}
      className={cn(
        "glass-panel-premium glow-hover group relative flex flex-col justify-between",
        "h-40 min-h-[10rem] border border-white/10 outline-none cursor-pointer",
        "active:scale-[0.98]",
        "focus-visible:ring-2 focus-visible:ring-white/20",
        className
      )}
      {...props}
    >
      {/* Background Gradient Mesh (Subtle) */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 100% 0%, ${glowColor}, transparent 50%)`
        }}
      />

      <div className="absolute inset-0 bg-noise z-0" />

      {/* Content Container */}
      <div className="relative z-10 p-5 flex flex-col h-full justify-between">

        {/* Top: Header & Actions */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <StatusLED color={project.color || 'zinc'} size="md" className="shadow-[0_0_10px_currentColor]" />
            {project.isProtected && (
              <Lock className="w-3 h-3 text-zinc-500" />
            )}
          </div>

          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-2 text-zinc-500 hover:text-white rounded-full hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-panel rounded-lg border-white/10 bg-black/80 backdrop-blur-xl">
                {onEdit && (
                  <DropdownMenuItem
                    onClick={e => { e.stopPropagation(); onEdit(project); }}
                    className="text-xs font-medium cursor-pointer text-zinc-400 hover:text-white focus:bg-white/10"
                  >
                    Configurações
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={e => { e.stopPropagation(); onDelete(project); }}
                    className="text-red-400 focus:text-red-300 focus:bg-red-500/10 text-xs font-medium cursor-pointer"
                  >
                    Excluir Projeto
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Middle: Title */}
        <div className="flex flex-col gap-1 mt-2">
          <h3 className="text-xl font-bold text-white tracking-tight group-hover:translate-x-1 transition-transform duration-300 font-brick-title leading-none">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-[11px] text-zinc-500 font-medium line-clamp-1 group-hover:text-zinc-400 transition-colors">
              {project.description}
            </p>
          )}
        </div>

        {/* Bottom: Meta & CTA */}
        <div className="flex justify-between items-end mt-auto pt-3 border-t border-white/5 group-hover:border-white/10 transition-colors">
          <div className="flex items-center gap-1.5 text-zinc-600 group-hover:text-zinc-400 transition-colors">
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
              {subProjectCount} {subProjectCount === 1 ? 'Área' : 'Áreas'}
            </span>
          </div>

          <div className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 group-hover:bg-white/10 text-zinc-500 group-hover:text-white transition-all transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
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
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  className: PropTypes.string,
};