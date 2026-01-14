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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/10 h-16 px-4 flex items-center justify-between safe-area-pb">
      
      {/* Home */}
      <TabButton 
        icon={Home} 
        label="Início" 
        active={currentView === 'home'} 
        onClick={() => setCurrentView('home')} 
      />

      {/* Search */}
      <TabButton 
        icon={Search} 
        label="Busca" 
        onClick={onOpenSearch} 
      />

      {/* Action Center (Add) */}
      <div className="relative -top-4">
        <button 
          onClick={onOpenCreateProject}
          className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-90 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Projects */}
      <TabButton 
        icon={Folder} 
        label="Projetos" 
        active={currentView === 'project' || currentView === 'subproject'} 
        onClick={() => currentView === 'home' ? null : setCurrentView('project')} 
      />

      {/* Profile/Menu */}
      <TabButton 
        icon={User} 
        label="Menu" 
        onClick={onOpenSettings} 
      />

    </nav>
  );
}

function TabButton({ icon: Icon /* eslint-disable-line no-unused-vars */, label, active, onClick }) {
   return (
     <button 
       onClick={onClick}
       className={cn(
         "flex flex-col items-center justify-center gap-1 transition-colors min-w-[60px]",
         active ? "text-white" : "text-zinc-600 hover:text-zinc-400"
       )}
     >
      <Icon size={20} className={cn(active && "animate-in zoom-in duration-300")} />
      <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}
