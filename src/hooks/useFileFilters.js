import { useMemo } from 'react';

export function useFileFilters(files = [], folders = [], searchQuery = '', typeFilter = 'all', sortBy = 'newest') {
    return useMemo(() => {
        let filteredFiles = [...files];
        let filteredFolders = [...folders];

        // 1. Search Query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filteredFiles = filteredFiles.filter(f => f.name.toLowerCase().includes(query));
            filteredFolders = filteredFolders.filter(f => f.name.toLowerCase().includes(query));
        }

        // 2. Type Filter
        if (typeFilter !== 'all') {
            filteredFiles = filteredFiles.filter(f => {
                if (typeFilter === 'image') return f.type?.startsWith('image/');
                if (typeFilter === 'video') return f.type?.startsWith('video/');
                if (typeFilter === 'audio') return f.type?.startsWith('audio/');
                if (typeFilter === 'document') return f.type?.includes('pdf') || f.type?.includes('text');
                return true;
            });
            // Usually folders are always shown or hidden? For now keep them if they match search
        }

        // 3. Sorting
        const sortFn = (a, b) => {
            if (sortBy === 'newest') return new Date(b.created_at || b.upload_date) - new Date(a.created_at || a.upload_date);
            if (sortBy === 'oldest') return new Date(a.created_at || a.upload_date) - new Date(b.created_at || b.upload_date);
            if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
            if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
            if (sortBy === 'size_desc') return (b.size || 0) - (a.size || 0);
            return 0;
        };

        filteredFiles.sort(sortFn);
        filteredFolders.sort(sortFn);

        return { filteredFiles, filteredFolders };
    }, [files, folders, searchQuery, typeFilter, sortBy]);
}
