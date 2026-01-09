import React from 'react';
import logoImage from '../../assets/brickflowbranco.png';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { RotateCcw, LogOut, Settings } from 'lucide-react';

function LegacyHeader({
  currentView,
  setCurrentView,
  currentProject,
  isSyncing,
  currentUser,
  handleSwitchUser,
  handleLogout,
  onOpenSettings
}) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-black">
      <div className="w-full h-20 flex items-center justify-between px-8">
        
        {/* LADO ESQUERDO */}
        <div className="flex items-center gap-12">
          {/* Logo */}
          <div onClick={() => setCurrentView('home')} className="cursor-pointer hover:opacity-80 transition-opacity">
             <img src={logoImage} alt="BrickFlow" className="h-5 w-auto" />
          </div>
          
          {/* Navegação Primária */}
          <nav className="flex items-center gap-8">
            <button 
                onClick={() => setCurrentView('home')}
                className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${currentView === 'home' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
                Central
            </button>
            <button
              onClick={() => setCurrentView('trash')}
              className="text-[10px] font-bold text-zinc-600 hover:text-white uppercase tracking-[0.2em] transition-colors"
            >
              Lixeira
            </button>
            
            {/* Breadcrumb de Projeto */}
            {currentProject && (
              <div className="flex items-center gap-8 animate-in fade-in slide-in-from-left-2 duration-300">
                <span className="text-zinc-800 text-[10px] font-bold">/</span>
                <button 
                  onClick={() => setCurrentView('project')}
                  className="text-[10px] font-bold text-white uppercase tracking-[0.2em] hover:text-zinc-300 transition-colors"
                >
                  {currentProject.name}
                </button>
              </div>
            )}
          </nav>
        </div>
        
        {/* LADO DIREITO */}
        <div className="flex items-center gap-8">
          {isSyncing && (
              <span className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest animate-pulse">Salvando...</span>
          )}
          
          <div className="flex items-center gap-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="h-8 w-8 bg-zinc-900 flex items-center justify-center cursor-pointer hover:bg-zinc-800 transition-colors border border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-500">
                      {currentUser?.displayName?.charAt(0)}
                    </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-black border-zinc-800 rounded-none shadow-2xl p-0" align="end">
                <DropdownMenuLabel className="p-4 pb-2">
                  <p className="text-xs font-black text-white uppercase tracking-tighter">{currentUser?.displayName}</p>
                  <p className="text-[9px] text-zinc-600 font-mono tracking-widest mt-1">@{currentUser?.username}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-900 m-0" />
                <DropdownMenuItem onClick={onOpenSettings} className="focus:bg-zinc-900 focus:text-white cursor-pointer uppercase text-[9px] font-bold tracking-widest h-10 rounded-none px-4">
                  <Settings className="mr-3 h-3 w-3" /> Configurações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSwitchUser} className="focus:bg-zinc-900 focus:text-white cursor-pointer uppercase text-[9px] font-bold tracking-widest h-10 rounded-none px-4">
                  <RotateCcw className="mr-3 h-3 w-3" /> Trocar Conta
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-900 m-0" />
                <DropdownMenuItem onClick={handleLogout} className="text-red-900 focus:text-red-500 focus:bg-zinc-900 cursor-pointer uppercase text-[9px] font-bold tracking-widest h-10 rounded-none px-4">
                  <LogOut className="mr-3 h-3 w-3" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}

export default LegacyHeader;
