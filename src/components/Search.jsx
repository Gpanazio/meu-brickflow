import React, { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { useSearch } from '../hooks/useSearch';

export function Search({ projects, onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const { searchTerm, setSearchTerm, searchResults } = useSearch(projects);

  const handleSelect = (result) => {
    onNavigate(result);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div>
      <button onClick={() => setIsOpen(true)} className="flex items-center gap-2 text-zinc-400 hover:text-white">
        <SearchIcon size={18} />
        <span className="text-sm">Search</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-start pt-20 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-zinc-800">
              <input
                type="text"
                placeholder="Search for projects, areas, or tasks..."
                className="w-full bg-transparent text-white placeholder-zinc-500 focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {searchResults.map((result, index) => (
                <div key={index} onClick={() => handleSelect(result)} className="p-3 hover:bg-zinc-800 rounded-md cursor-pointer">
                  <p className="font-bold">{result.name || result.title}</p>
                  <p className="text-sm text-zinc-400">{result.type}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
