import React from 'react';
import logoImage from '../../assets/brickflowbranco.png';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
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
    <header className="sticky top-0 z-50 w-full border-b border-zinc-900 bg-black backdrop-blur-sm">
      <div className="container flex h-14 items-center justify-between mx-auto px-4 md:px-8">
        
        {/* ESQUERDA: Logo e Navegação */}
        <div className="flex items-center h-full">
          <div onClick={() => setCurrentView('home')} className="cursor-pointer hover:opacity-70 transition-opacity flex items-center pr-6">
             <img src={logoImage} alt="BrickFlow" className="h-4 w-auto" />
          </div>
          
          <div className="h-4 w-px bg-zinc-800 mx-2" />
          
          <nav className="flex items-center pl-6 gap-2">
            <Button 
                variant="ghost" 
                className={`uppercase tracking-widest text-[10px] font-bold rounded-none h-8 px-2 hover:bg-transparent ${currentView === 'home' ? 'text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`} 
                onClick={() => setCurrentView('home')}
            >
                Central
            </Button>
            
            {/* Breadcrumb de Projeto (Se ativo) */}
            {currentProject && (
              <>
                <span className="text-zinc-800 text-[10px] font-bold">/</span>
                <Button variant="ghost" className="uppercase tracking-widest text-[10px] font-bold text-white hover:text-zinc-300 rounded-none h-8 px-2 hover:bg-transparent" onClick={() => setCurrentView('project')}>
                    {currentProject.name}
                </Button>
              </>
            )}
          </nav>
        </div>
        
        {/* DIREITA: Status e Usuário */}
        <div className="flex items-center gap-6">
          {isSyncing && (
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest animate-pulse">Sincronizando...</span>
          )}
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setCurrentView('trash')} className="text-[10px] font-bold text-zinc-600 hover:text-white uppercase tracking-widest h-8 px-2 rounded-none hover:bg-transparent">
              Lixeira
            </Button>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 rounded-full p-0 hover:bg-zinc-900 border border-zinc-900">
                    <Avatar className="h-full w-full rounded-full">
                        <AvatarFallback className="bg-black text-zinc-500 text-[10px] font-bold">
                            {currentUser?.displayName?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-black border-zinc-900 rounded-none shadow-2xl" align="end">
                <DropdownMenuLabel className="p-4 pb-2">
                    <p className="text-xs font-black text-white uppercase tracking-tight">{currentUser?.displayName}</p>
                    <p className="text-[9px] text-zinc-600 font-mono tracking-widest mt-1">@{currentUser?.username}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-900" />
                <DropdownMenuItem onClick={onOpenSettings} className="focus:bg-zinc-900 focus:text-white cursor-pointer uppercase text-[9px] font-bold tracking-widest h-9">
                    <Settings className="mr-3 h-3 w-3" /> Configurações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSwitchUser} className="focus:bg-zinc-900 focus:text-white cursor-pointer uppercase text-[9px] font-bold tracking-widest h-9">
                    <RotateCcw className="mr-3 h-3 w-3" /> Trocar Conta
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-900" />
                <DropdownMenuItem onClick={handleLogout} className="text-red-900 focus:text-red-500 focus:bg-zinc-900 cursor-pointer uppercase text-[9px] font-bold tracking-widest h-9">
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
