import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();

  const [projectMetadata, setProjectMetadata] = useState({ projectName: null, subProjectName: null });

  // Derive IDs from URL
  const routeParams = useMemo(() => {
    const path = location.pathname;
    const projectMatch = path.match(/^\/project\/([^/]+)/);
    const areaMatch = path.match(/^\/project\/([^/]+)\/area\/([^/]+)/);

    if (areaMatch) {
      return { view: 'subproject', projectId: areaMatch[1], subProjectId: areaMatch[2] };
    } else if (projectMatch) {
      return { view: 'project', projectId: projectMatch[1], subProjectId: null };
    }
    return { view: 'home', projectId: null, subProjectId: null };
  }, [location.pathname]);

  // Fetch Metadata when route changes
  useEffect(() => {
    const controller = new AbortController();

    const fetchMetadata = async () => {
      // Reset immediately on route change
      setProjectMetadata(prev => ({ ...prev, projectName: null, subProjectName: null }));

      try {
        if (routeParams.view === 'project' && routeParams.projectId) {
          const res = await fetch(`/api/v2/projects/${routeParams.projectId}`, { signal: controller.signal });
          if (!res.ok) throw new Error('Failed to fetch project');
          const data = await res.json();
          setProjectMetadata(prev => ({ ...prev, projectName: data.name }));
        }
        else if (routeParams.view === 'subproject' && routeParams.subProjectId) {
          // We might need project name too, usually typically fetched from subproject's parent or separate call
          // For simplicity, let's try fetching subproject. If API supports returning parent info, great.
          // Looking at API: GET /api/v2/subprojects/:id returns subproject data.
          // To get Project Name, we might need a separate call or rely on context if we store projects globally.
          // Let's just fetch subproject name for now.
          const res = await fetch(`/api/v2/subprojects/${routeParams.subProjectId}`, { signal: controller.signal });
          if (!res.ok) throw new Error('Failed to fetch subproject');
          const data = await res.json();

          // If we also want project name, we might need to fetch project :id too.
          // Let's do it if we have projectId (which we do from URL)
          if (routeParams.projectId) {
            const resProj = await fetch(`/api/v2/projects/${routeParams.projectId}`, { signal: controller.signal });
            if (resProj.ok) {
              const dataProj = await resProj.json();
              setProjectMetadata({ projectName: dataProj.name, subProjectName: data.title || data.name }); // subproject usually has 'title' or 'name'
              return;
            }
          }
          setProjectMetadata(prev => ({ ...prev, subProjectName: data.title || data.name }));
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Metadata fetch error:', error);
          // Optional: set error state
        }
      }
    };

    fetchMetadata();

    return () => controller.abort();
  }, [routeParams.view, routeParams.projectId, routeParams.subProjectId]);

  // Construct Mason Context
  const masonContext = useMemo(() => ({
    user: currentUser?.name || 'User',
    view: routeParams.view,
    projectId: routeParams.projectId,
    projectName: projectMetadata.projectName,
    subProjectId: routeParams.subProjectId,
    subProjectName: projectMetadata.subProjectName
  }), [currentUser?.name, routeParams, projectMetadata]);

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

      <MasonFloating
        clientContext={masonContext}
        isOpen={isMasonOpen}
        onOpenChange={setIsMasonOpen}
      />
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
