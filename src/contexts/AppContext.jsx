import React, { createContext, useContext, useState, useCallback } from 'react';
import { toast } from 'sonner';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [currentSubProject, setCurrentSubProject] = useState(null);
  const [currentBoardType, setCurrentBoardType] = useState('kanban');

  const [modalState, setModalState] = useState({ type: null, isOpen: false, data: null, mode: 'create' });
  const [currentView, setCurrentView] = useState('home');

  const login = useCallback(async (username, pin) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin })
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data?.error || 'Falha no login';
        toast.error(message);
        return false;
      }

      setCurrentUser(data.user);
      toast.success(`Bem-vindo, ${data.user.displayName || data.user.username}!`);
      return true;
    } catch (err) {
      console.error('Error in login:', err);
      toast.error('Falha no login');
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      setCurrentProject(null);
      setCurrentSubProject(null);
      setProjects([]);
      toast.success('Logout realizado');
    } catch (err) {
      console.error('Error in logout:', err);
      toast.error('Falha no logout');
    }
  }, []);

  const value = {
    currentUser,
    setCurrentUser,
    projects,
    setProjects,
    currentProject,
    setCurrentProject,
    currentSubProject,
    setCurrentSubProject,
    currentBoardType,
    setCurrentBoardType,
    modalState,
    setModalState,
    currentView,
    setCurrentView,
    // Authentication is now handled by useUsers hook in AppShell, 
    // but we expose these for compatibility if needed, though they should ideally come from useUsers
    // For now, these legacy functions in AppContext should probably be removed or delegate if we rework the hierarchy.
    // However, since AppShell wraps the app and uses useUsers, and AppProvider is inside or outside?
    // If AppProvider is outside AppShell, it can't use useUsers if useUsers depends on AppProvider? 
    // Actually useUsers doesn't depend on Context.
    // Let's defer to the plan: "Refactor AppProvider to use useUsers internally".
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp deve ser usado dentro de AppProvider');
  }
  return context;
}
