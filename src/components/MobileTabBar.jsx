import React from 'react';
import { Home, Search, Folder, User, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileTabBar({
  currentView,
  setCurrentView,
  onOpenSearch,
  onOpenSettings,
  onOpenCreateProject
}) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-t border-white/10 safe-area-pb"
      role="navigation"
      aria-label="Navegação principal mobile"
    >
      <div className="h-16 px-2 flex items-center justify-around">
        {/* Home */}
        <TabButton
          icon={Home}
          label="Início"
          active={currentView === 'home'}
          onClick={() => setCurrentView('home')}
          ariaLabel="Ir para página inicial"
        />

        {/* Search */}
        <TabButton
          icon={Search}
          label="Busca"
          onClick={onOpenSearch}
          ariaLabel="Abrir busca"
        />

        {/* Action Center (Add) - FAB */}
        <div className="relative -top-4">
          <button
            onClick={onOpenCreateProject}
            aria-label="Criar novo projeto"
            className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.4)] active:scale-95 hover:shadow-[0_0_40px_rgba(255,255,255,0.6)] transition-all duration-200 touch-target"
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
        </div>

        {/* Projects */}
        <TabButton
          icon={Folder}
          label="Projetos"
          active={currentView === 'project' || currentView === 'subproject'}
          onClick={() => currentView === 'home' ? null : setCurrentView('project')}
          ariaLabel="Ver projetos"
        />

        {/* Profile/Menu */}
        <TabButton
          icon={User}
          label="Menu"
          onClick={onOpenSettings}
          ariaLabel="Abrir menu de configurações"
        />
      </div>
    </nav>
  );
}

function TabButton({ icon: Icon /* eslint-disable-line no-unused-vars */, label, active, onClick, ariaLabel }) {
   return (
     <button
       onClick={onClick}
       aria-label={ariaLabel}
       aria-current={active ? 'page' : undefined}
       className={cn(
         "flex flex-col items-center justify-center gap-1.5 transition-all duration-200 touch-target px-3 py-2 rounded-lg",
         "active:scale-95 active:bg-white/5",
         active
           ? "text-white"
           : "text-zinc-600 hover:text-zinc-400 active:text-zinc-300"
       )}
     >
      <Icon
        size={22}
        strokeWidth={active ? 2.5 : 2}
        className={cn(
          "transition-all duration-200",
          active && "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
        )}
      />
      <span className={cn(
        "text-[10px] font-bold uppercase tracking-widest transition-all",
        active ? "opacity-100" : "opacity-70"
      )}>
        {label}
      </span>
    </button>
  );
}
