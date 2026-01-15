import { ChevronRight, Folder } from 'lucide-react';

export default function FolderBreadcrumb({ path, onNavigate }) {
    if (!path || path.length === 0) return null;

    return (
        <div className="flex items-center gap-1 mb-4 px-1 overflow-x-auto scrollbar-hide">
            {path.map((item, index) => {
                const isLast = index === path.length - 1;

                return (
                    <div key={item.id || 'root'} className="flex items-center gap-1 shrink-0">
                        {index > 0 && (
                            <ChevronRight className="w-3 h-3 text-zinc-600" />
                        )}

                        <button
                            onClick={() => !isLast && onNavigate(item.id)}
                            disabled={isLast}
                            className={`
                flex items-center gap-1.5 px-2 py-1 text-xs font-mono uppercase tracking-widest
                transition-colors
                ${isLast
                                    ? 'text-white cursor-default'
                                    : 'text-zinc-500 hover:text-white hover:bg-zinc-900 cursor-pointer'
                                }
              `}
                        >
                            <Folder className="w-3 h-3" strokeWidth={1.5} />
                            {item.name}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
