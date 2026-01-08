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
    <header className="sticky top-0 z-50 w-full border-b border-zinc-900 bg-black/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between mx-auto px-4 md:px-8">
        <div className="flex items-center gap-4">
          <div onClick={() => setCurrentView('home')} className="cursor-pointer hover:opacity-70 transition-opacity">
             <img src={logoImage} alt="BrickFlow" className="h-5 w-auto" />
          </div>
          <Separator orientation="vertical" className="h-3 bg-zinc-800" />
          <nav className="flex items-center gap-2">
            <Button variant="ghost" className={`uppercase tracking-widest text-[10px] font-bold rounded-none h-8 px-2 ${currentView === 'home' ? 'text-white' : 'text-zinc-600'}`} onClick={() => setCurrentView('home')}>Central</Button>
            <Button variant="ghost" className={`uppercase tracking-widest text-[10px] font-bold rounded-none h-8 px-2 ${currentView === 'trash' ? 'text-white' : 'text-zinc-600'}`} onClick={() => setCurrentView('trash')}>Lixeira</Button>
            {currentProject && (
              <>
                <span className="text-zinc-800">/</span>
                <Button variant="ghost" className="uppercase tracking-widest text-[10px] font-bold text-zinc-600 hover:text-white rounded-none h-8 px-2" onClick={() => setCurrentView('project')}>{currentProject.name}</Button>
              </>
            )}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          {isSyncing && <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 rounded-none p-0 hover:bg-zinc-900">
                <Avatar className="h-5 w-5 rounded-none"><AvatarFallback className="bg-zinc-900 text-zinc-500 text-[9px] rounded-none">{currentUser?.displayName?.charAt(0)}</AvatarFallback></Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 bg-black border-zinc-800 rounded-none shadow-xl" align="end">
              <DropdownMenuLabel className="p-3">
                <p className="text-xs font-bold text-white uppercase tracking-tight">{currentUser?.displayName}</p>
                <p className="text-[9px] text-zinc-600 font-mono tracking-widest">@{currentUser?.username}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-900" />
              <DropdownMenuItem onClick={onOpenSettings} className="focus:bg-zinc-900 focus:text-white cursor-pointer uppercase text-[9px] tracking-widest h-8">
                <Settings className="mr-2 h-3 w-3" /> Configurações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSwitchUser} className="focus:bg-zinc-900 focus:text-white cursor-pointer uppercase text-[9px] tracking-widest h-8"><RotateCcw className="mr-2 h-3 w-3" /> Trocar</DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-900 focus:text-red-600 focus:bg-zinc-900 cursor-pointer uppercase text-[9px] tracking-widest h-8"><LogOut className="mr-2 h-3 w-3" /> Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default LegacyHeader;
