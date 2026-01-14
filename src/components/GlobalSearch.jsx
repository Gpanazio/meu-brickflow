import React, { useState, useCallback, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

const GlobalSearch = ({ isOpen, onNavigate, isSearchOpen, setIsSearchOpen, projects, searchTerm, setSearchTerm, searchResults }) => {
  const { setModalState, setCurrentProject, setCurrentView, setCurrentSubProject, setCurrentBoardType } = useApp();

  const handleSelect = useCallback((result) => {
    onNavigate(result);
    setIsSearchOpen(false);
  }, [onNavigate, setIsSearchOpen]);

  const handleOpenTask = useCallback((result) => {
    setCurrentProject(result.parentProject);
    setCurrentSubProject(result.parentSubProject);
    setCurrentView('subproject');
    setCurrentBoardType(result.boardType || 'kanban');

    setModalState({
      type: 'task',
      isOpen: true,
      data: result,
      listId: result.listId,
      mode: 'edit'
    });
    setIsSearchOpen(false);
  }, [setCurrentProject, setCurrentSubProject, setCurrentView, setCurrentBoardType, setModalState, setIsSearchOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setIsSearchOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-start justify-center p-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar projetos, áreas ou tarefas..."
              className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder:text-zinc-500"
              autoFocus
            />
            <button
              onClick={() => setIsSearchOpen(false)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {searchResults.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <p className="text-sm">Nenhum resultado encontrado</p>
            </div>
          ) : (
            <div className="space-y-1">
              {searchResults.map((result, index) => (
                <div
                  key={`${result.type}-${index}`}
                  onClick={() => {
                    if (result.type === 'Task') {
                      handleOpenTask(result);
                    } else {
                      handleSelect(result);
                    }
                  }}
                  className={`p-3 hover:bg-zinc-800 cursor-pointer transition-colors ${
                    result.type === 'Task' ? 'rounded' : 'border-b border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold uppercase tracking-widest ${
                      result.type === 'Project' ? 'bg-blue-600' :
                      result.type === 'SubProject' ? 'bg-purple-600' :
                      'bg-zinc-600'
                    }`}>
                      {result.type === 'Project' && '📁'}
                      {result.type === 'SubProject' && '📂'}
                      {result.type === 'Task' && '✅'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white">{result.name}</div>
                      {result.type === 'Project' && <div className="text-xs text-zinc-400 mt-0.5">{result.description || ''}</div>}
                      {result.type === 'SubProject' && <div className="text-xs text-zinc-400 mt-0.5">Área em {result.parentProject?.name || '...'}</div>}
                      {result.type === 'Task' && (
                        <>
                          <div className="text-xs text-zinc-500 mt-0.5">em {result.parentSubProject?.name || '...'}</div>
                          <div className="text-sm text-zinc-400">{result.title}</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
