import logoImage from '../../assets/brickflowbranco.png';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { Separator } from '../ui/separator';
import { RotateCcw, LogOut, Settings, Users, Activity, Bot } from 'lucide-react';
import { Search } from '../Search';
import MechButton from '../ui/MechButton';
import StatusLED from '../ui/StatusLED';
import { isAdmin } from '@/constants/permissions';

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
  onOpenBlackBox,
  onOpenMason,

  projects,
  onSearchNavigate,
  isSearchOpen,
  setIsSearchOpen
}) {
  const canManageTeam = isAdmin(currentUser?.username);

  return (
    <header className="sticky top-0 z-50 w-full glass-header safe-area-pt">
      {/* Header compacto h-16 (64px) */}
      <div className="w-full h-14 md:h-16 flex items-center justify-between px-4 md:px-6 lg:px-10">

        {/* LADO ESQUERDO */}
        <div className="flex items-center gap-4 md:gap-8">
          {/* Logo */}
          <div
            onClick={() => setCurrentView('home')}
            className="cursor-pointer hover:opacity-80 transition-opacity touch-feedback"
            role="button"
            tabIndex={0}
            aria-label="Voltar para página inicial"
          >
            <img src={logoImage} alt="BrickFlow" className="h-6 md:h-7 w-auto" />
          </div>

          <Separator orientation="vertical" className="hidden md:block h-8 bg-zinc-800" />

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
        <div className="flex items-center gap-2 md:gap-3 lg:gap-6">
          <div className="hidden md:block">
            <Search projects={projects} onNavigate={onSearchNavigate} />
          </div>

          <MechButton
            className="h-8 px-3 text-green-600 border-green-900/30 bg-green-950/10 hover:bg-green-900/20 hover:text-green-400 hover:border-green-500/50 hidden md:flex"
            icon={Activity}
            onClick={onOpenBlackBox}
          >
            LOGS
          </MechButton>

          <MechButton
            className="h-8 px-3 text-indigo-400 border-indigo-900/30 bg-indigo-950/10 hover:bg-indigo-900/20 hover:text-indigo-300 hover:border-indigo-500/50 hidden md:flex"
            icon={Bot}
            onClick={onOpenMason}
          >
            MASON
          </MechButton>

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
              <Button
                variant="ghost"
                className="h-11 w-11 md:h-14 md:w-14 rounded-full p-0 hover:bg-white/10 border border-transparent hover:border-white/20 transition-all touch-target"
                aria-label="Menu do usuário"
              >
                <Avatar key={currentUser?.avatar || 'fallback'} className="h-10 w-10 md:h-12 md:w-12 border-2 border-zinc-900">
                  <AvatarImage src={currentUser?.avatar} className="object-cover" />
                  <AvatarFallback className="bg-zinc-800 text-zinc-400 text-base md:text-lg font-bold">
                    {(currentUser?.name || currentUser?.username || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 md:w-56 glass-panel rounded-none p-0 mr-2 md:mr-0" align="end">
              <DropdownMenuLabel className="p-4 pb-3 md:pb-2">
                <p className="text-xs md:text-xs font-black text-white uppercase tracking-tighter">{currentUser?.name || currentUser?.username}</p>
                <p className="text-xs md:text-xs text-zinc-600 font-mono tracking-widest mt-1 font-medium">@{currentUser?.username}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-900 m-0" />

              {canManageTeam && (
                <DropdownMenuItem onClick={onOpenTeamManagement} className="focus:bg-zinc-900 focus:text-white cursor-pointer uppercase text-xs font-bold tracking-widest h-12 md:h-10 rounded-none px-4 touch-target">
                  <Users className="mr-3 h-4 w-4 md:h-3 md:w-3" /> Gerenciar Equipe
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={onOpenSettings} className="focus:bg-zinc-900 focus:text-white cursor-pointer uppercase text-xs font-bold tracking-widest h-12 md:h-10 rounded-none px-4 touch-target">
                <Settings className="mr-3 h-4 w-4 md:h-3 md:w-3" /> Configurações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSwitchUser} className="focus:bg-zinc-900 focus:text-white cursor-pointer uppercase text-xs font-bold tracking-widest h-12 md:h-10 rounded-none px-4 touch-target">
                <RotateCcw className="mr-3 h-4 w-4 md:h-3 md:w-3" /> Trocar Conta
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-900 m-0" />
              <DropdownMenuItem onClick={handleLogout} className="text-red-900 focus:text-red-500 focus:bg-zinc-900 cursor-pointer uppercase text-xs font-bold tracking-widest h-12 md:h-10 rounded-none px-4 touch-target">
                <LogOut className="mr-3 h-4 w-4 md:h-3 md:w-3" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default LegacyHeader;
