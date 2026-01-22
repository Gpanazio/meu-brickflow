import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AppProvider } from './contexts/AppContext';
import { useUsers } from './hooks/useUsers';

// Pages
import HomePage from './pages/HomePage';
import ProjectPage from './pages/ProjectPage';
import BoardPage from './pages/BoardPage';

// Components
import LegacyHeader from './components/legacy/LegacyHeader';
import MasonFloating from './components/MasonFloating';
import { Loader2 } from 'lucide-react';

function AppShell() {
  const {
    currentUser,
    isLoggedIn,
    isAuthLoading,
    authError,
    handleLogin,
    handleLogout
  } = useUsers();

  const [isMasonOpen, setIsMasonOpen] = useState(false);
  const navigate = useNavigate();

  // Simple Auth Wall
  if (isAuthLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-20 min-h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black p-4">
        <Toaster />
        <div className="w-full max-w-sm glass-panel p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold tracking-widest text-white uppercase">BrickFlow OS</h1>
            <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Acesso Restrito</p>
          </div>
          {authError && <p className="text-xs text-red-400 font-bold text-center">{authError}</p>}
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target); handleLogin(fd.get('username'), fd.get('pin')); }} className="space-y-4">
            <input name="username" placeholder="ID" required className="h-12 bg-zinc-950 border border-zinc-800 text-white w-full px-4 rounded" />
            <input name="pin" type="password" placeholder="PIN" required className="h-12 text-center tracking-[0.5em] bg-zinc-950 border border-zinc-800 text-white w-full px-4 rounded" />
            <button type="submit" className="w-full bg-white text-zinc-950 hover:bg-zinc-200 uppercase font-bold tracking-widest h-12 rounded">Entrar</button>
          </form>
        </div>
      </div >
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans overflow-hidden">
      <LegacyHeader
        currentUser={currentUser}
        handleLogout={handleLogout}
        onOpenMason={() => setIsMasonOpen(true)}
        // Pass other props if needed or refactor header to be self-sufficient
        currentView={'home'}
        currentProject={null}
      />

      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto p-0 md:p-8 pt-4 md:pt-6 pb-20 md:pb-8 custom-scrollbar safe-area-pb">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/project/:projectId" element={<ProjectPage />} />
            <Route path="/project/:projectId/area/:areaId" element={<BoardPage />} />
          </Routes>
        </div>
      </main>

      <MasonFloating clientContext={{ user: currentUser?.name }} />
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
