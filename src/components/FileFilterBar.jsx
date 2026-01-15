import React from 'react';
import { Search, X, Filter, SortDesc } from 'lucide-react';
import { Input } from './ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import MechButton from './ui/MechButton';
import PrismaticPanel from './ui/PrismaticPanel';

export default function FileFilterBar({
    searchQuery,
    onSearchChange,
    typeFilter,
    onTypeFilterChange,
    sortBy,
    onSortByChange,
    fileCount,
    onClearFilters
}) {
    const hasFilters = searchQuery || typeFilter !== 'all' || sortBy !== 'newest';

    return (
        <PrismaticPanel className="mb-6 mx-1" contentClassName="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">

                {/* Search Input */}
                <div className="relative w-full md:w-72 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Buscar por nome..."
                        className="pl-10 bg-black/40 border-zinc-800 focus:border-white transition-all rounded-none h-10 font-mono text-xs uppercase tracking-widest placeholder:text-zinc-700"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>

                {/* Filters and Sort */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">

                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-2 flex-1 sm:flex-none">
                            <Filter className="w-3 h-3 text-zinc-500 hidden sm:block" />
                            <Select value={typeFilter} onValueChange={onTypeFilterChange}>
                                <SelectTrigger className="w-full sm:w-32 bg-black/40 border-zinc-800 rounded-none h-10 font-mono text-[10px] uppercase tracking-widest">
                                    <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                <SelectContent className="bg-black border-zinc-800 rounded-none ring-0">
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="image">Imagens</SelectItem>
                                    <SelectItem value="pdf">PDFs</SelectItem>
                                    <SelectItem value="audio">Áudio</SelectItem>
                                    <SelectItem value="video">Vídeo</SelectItem>
                                    <SelectItem value="document">Docs</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2 flex-1 sm:flex-none">
                            <SortDesc className="w-3 h-3 text-zinc-500 hidden sm:block" />
                            <Select value={sortBy} onValueChange={onSortByChange}>
                                <SelectTrigger className="w-full sm:w-40 bg-black/40 border-zinc-800 rounded-none h-10 font-mono text-[10px] uppercase tracking-widest">
                                    <SelectValue placeholder="Ordenar" />
                                </SelectTrigger>
                                <SelectContent className="bg-black border-zinc-800 rounded-none ring-0">
                                    <SelectItem value="newest">Mais Recentes</SelectItem>
                                    <SelectItem value="oldest">Mais Antigos</SelectItem>
                                    <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
                                    <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
                                    <SelectItem value="size-desc">Maior Tamanho</SelectItem>
                                    <SelectItem value="size-asc">Menor Tamanho</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {hasFilters && (
                        <MechButton
                            onClick={onClearFilters}
                            className="h-10 px-4 w-full sm:w-auto mt-2 sm:mt-0"
                            icon={X}
                        >
                            Limpar
                        </MechButton>
                    )}

                    <div className="ml-auto md:ml-4 pl-4 border-l border-zinc-900 hidden md:block">
                        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                            {fileCount} Resultados
                        </span>
                    </div>
                </div>

            </div>
        </PrismaticPanel>
    );
}
