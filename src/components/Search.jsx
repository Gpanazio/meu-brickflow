import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Folder, Layout, CheckCircle } from 'lucide-react';
import { useSearch } from '../hooks/useSearch';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from './ui/command';

export function Search({ projects, onNavigate }) {
  const [open, setOpen] = useState(false);
  const { searchTerm, setSearchTerm, searchResults } = useSearch(projects);

  // Atalho de teclado Cmd+K ou Ctrl+K
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (result) => {
    onNavigate(result);
    setOpen(false);
    setSearchTerm('');
  };

  // Agrupando resultados
  const projectsResults = searchResults.filter(r => r.type === 'Project');
  const subProjectsResults = searchResults.filter(r => r.type === 'SubProject');
  const tasksResults = searchResults.filter(r => r.type === 'Task');

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 px-3 py-1.5 text-zinc-500 hover:text-white transition-colors bg-white/5 border border-white/10 hover:border-white/20 rounded-none group"
      >
        <SearchIcon size={14} className="group-hover:scale-110 transition-transform" />
        <div className="flex items-center gap-2">
           <span className="text-xs font-bold uppercase tracking-widest">Busca</span>
           <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 border border-zinc-800 bg-black px-1.5 font-mono text-[10px] font-medium text-zinc-500 opacity-100 uppercase">
             <span className="text-xs">⌘</span>K
           </kbd>
        </div>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Procure projetos, áreas ou tarefas..." 
          value={searchTerm}
          onValueChange={setSearchTerm}
        />
        <CommandList className="custom-scrollbar">
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          
          {projectsResults.length > 0 && (
            <CommandGroup heading="Projetos">
              {projectsResults.map((result) => (
                <CommandItem key={result.id} onSelect={() => handleSelect(result)} className="cursor-pointer">
                  <Folder className="mr-2 h-4 w-4 text-blue-500" />
                  <span>{result.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {subProjectsResults.length > 0 && (
            <CommandGroup heading="Áreas">
              {subProjectsResults.map((result) => (
                <CommandItem key={result.id} onSelect={() => handleSelect(result)} className="cursor-pointer">
                  <Layout className="mr-2 h-4 w-4 text-purple-500" />
                  <div className="flex flex-col">
                    <span>{result.name}</span>
                    <span className="text-[10px] text-zinc-500 uppercase">{result.parentProject?.name}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {tasksResults.length > 0 && (
            <CommandGroup heading="Tarefas">
              {tasksResults.map((result) => (
                <CommandItem key={result.id} onSelect={() => handleSelect(result)} className="cursor-pointer">
                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                  <div className="flex flex-col">
                    <span>{result.title}</span>
                    <span className="text-[10px] text-zinc-500 uppercase">
                      {result.parentProject?.name} / {result.parentSubProject?.name}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
