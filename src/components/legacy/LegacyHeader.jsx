import React from 'react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { Separator } from '../ui/separator';
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
      <div className="w-full h-16 flex items-center justify-between px-8">
        
        {/* LADO ESQUERDO */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div onClick={() => setCurrentView('home')} className="cursor-pointer hover:opacity-80 transition-opacity">
             <img src={logoImage} alt="BrickFlow" className="h-4 w-auto" />
          </div>
          <Separator orientation="vertical" className="h-8 bg-zinc-800" />
          
          {/* Navegação Primária */}
          <nav className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setCurrentView('home')}
              className={`uppercase tracking-widest text-xs font-bold rounded-none h-10 px-4 ${currentView === 'home' ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
            >
              Central
            </Button>
            
            {/* Breadcrumb de Projeto */}
            {currentProject && (
              <>
                <span className="text-zinc-700">/</span>
                <Button
                  variant="ghost"
                  onClick={() => setCurrentView('project')}
                  className="uppercase tracking-widest text-xs font-bold text-zinc-500 hover:text-white rounded-none h-10 px-4"
                >
                  {currentProject.name}
                </Button>
              </>
            )}
          </nav>
        </div>
        
        {/* LADO DIREITO */}
        <div className="flex items-center gap-6">
          {isSyncing && <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-12 w-12 rounded-full p-0 hover:bg-zinc-900 border border-transparent hover:border-zinc-800">
                <Avatar className="h-10 w-10">
                  {currentUser?.avatar ? (
                    <AvatarImage src={currentUser.avatar} />
                  ) : (
                    <AvatarFallback className="bg-zinc-900 text-zinc-400 text-sm font-bold">
                      {currentUser?.displayName?.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
              </Button>
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
    </header>
  );
}

export default LegacyHeader;
