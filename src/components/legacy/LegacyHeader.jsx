import logoImage from '../../assets/brickflowbranco.png';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { Separator } from '../ui/separator';
import { RotateCcw, LogOut, Settings, Users } from 'lucide-react';
import { Search } from '../Search';
import MechButton from '../ui/MechButton';
import StatusLED from '../ui/StatusLED';

function LegacyHeader({
  currentView,
  setCurrentView,
  currentProject,
  isSyncing,
  currentUser,
  handleSwitchUser,
  handleLogout,
  onOpenSettings,
  onOpenTeamManagement,

  projects,
  onSearchNavigate,
  isSearchOpen,
  setIsSearchOpen
}) {
  const canManageTeam = ['gabriel', 'lufe'].includes(String(currentUser?.username || '').toLowerCase());

  return (
    <header className="sticky top-0 z-50 w-full glass-header">
      {/* Header compacto h-16 (64px) */}
      <div className="w-full h-16 flex items-center justify-between px-6 md:px-10">

        {/* LADO ESQUERDO */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div onClick={() => setCurrentView('home')} className="cursor-pointer hover:opacity-80 transition-opacity">
            <img src={logoImage} alt="BrickFlow" className="h-7 w-auto" />
          </div>

          <Separator orientation="vertical" className="h-8 bg-zinc-800" />

          {/* Navegação Primária */}
          <nav className="hidden md:flex items-center gap-4">
            <MechButton
              className={`h-8 px-4 ${currentView === 'home' ? 'text-white border-zinc-600 bg-white/5' : ''}`}
              onClick={() => setCurrentView('home')}
            >
              Central
            </MechButton>

            {/* Breadcrumb de Projeto */}
            {currentProject && (
              <>
                <span className="brick-tech text-zinc-800">/</span>
                <MechButton
                  className={`h-8 px-4 ${currentView === 'project' ? 'text-white border-zinc-600 bg-white/5' : ''}`}
                  onClick={() => setCurrentView('project')}
                >
                  {currentProject.name}
                </MechButton>
              </>
            )}
          </nav>
        </div>

        {/* LADO DIREITO - AVATAR DE VOLTA */}
        <div className="flex items-center gap-3 md:gap-6">
          <div className="hidden md:block">
            <Search projects={projects} onNavigate={onSearchNavigate} />
          </div>

          {/* Search Trigger oculto mas funcional via props para o MobileTabBar abrir o Command Palette */}
          <div className="md:hidden h-0 w-0 overflow-hidden">
            <Search
              projects={projects}
              onNavigate={onSearchNavigate}
              open={isSearchOpen}
              setOpen={setIsSearchOpen}
            />
          </div>

          {isSyncing && <StatusLED color="red" size="sm" />}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-14 w-14 rounded-full p-0 hover:bg-white/10 border border-transparent hover:border-white/20 transition-all">
                <Avatar key={currentUser?.avatar || 'fallback'} className="h-12 w-12 border-2 border-zinc-900">
                  <AvatarImage src={currentUser?.avatar} className="object-cover" />
                  <AvatarFallback className="bg-zinc-800 text-zinc-400 text-lg font-bold">
                    {(currentUser?.name || currentUser?.username || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 glass-panel rounded-none p-0" align="end">
              <DropdownMenuLabel className="p-4 pb-2">
                <p className="text-xs font-black text-white uppercase tracking-tighter">{currentUser?.name || currentUser?.username}</p>
                <p className="text-xs text-zinc-600 font-mono tracking-widest mt-1 font-medium">@{currentUser?.username}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-900 m-0" />

              {canManageTeam && (
                <DropdownMenuItem onClick={onOpenTeamManagement} className="focus:bg-zinc-900 focus:text-white cursor-pointer uppercase text-xs font-bold tracking-widest h-10 rounded-none px-4">
                  <Users className="mr-3 h-3 w-3" /> Gerenciar Equipe
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={onOpenSettings} className="focus:bg-zinc-900 focus:text-white cursor-pointer uppercase text-xs font-bold tracking-widest h-10 rounded-none px-4">
                <Settings className="mr-3 h-3 w-3" /> Configurações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSwitchUser} className="focus:bg-zinc-900 focus:text-white cursor-pointer uppercase text-xs font-bold tracking-widest h-10 rounded-none px-4">
                <RotateCcw className="mr-3 h-3 w-3" /> Trocar Conta
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-900 m-0" />
              <DropdownMenuItem onClick={handleLogout} className="text-red-900 focus:text-red-500 focus:bg-zinc-900 cursor-pointer uppercase text-xs font-bold tracking-widest h-10 rounded-none px-4">
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
