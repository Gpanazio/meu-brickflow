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