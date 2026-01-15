import { useState, useEffect } from 'react';
import { Upload, FolderPlus, X, Trash2, FileText, Music, Video } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatFileSize } from '../../utils/formatFileSize';

import MechButton from '../ui/MechButton';
import PrismaticPanel from '../ui/PrismaticPanel';
import FileFilterBar from '../FileFilterBar';
import FolderCard from '../FolderCard';
import FolderBreadcrumb from '../FolderBreadcrumb';
import CreateFolderModal from '../CreateFolderModal';
import { QuickLookModal } from '../ui/QuickLookModal';
import { Input } from '../ui/input';

export default function FilesBoard({
    // Files Data
    files,
    filteredFiles,
    folders,
    filteredFolders,

    // Drag & Drop State
    isFileDragging,
    setIsFileDragging,
    isUploading,

    // Handlers
    handleFileDrop,
    handleFileUploadWithFeedback,
    handleDeleteFile,
    handleMoveFile,

    // Folder Handlers
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleChangeFolderColor,

    // Navigation
    currentFolderPath,
    navigateToFolder,

    // Filters
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    sortBy,
    setSortBy
}) {
    const [hoveredFileId, setHoveredFileId] = useState(null);
    const [previewFile, setPreviewFile] = useState(null);
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
    const [dragOverFolderId, setDragOverFolderId] = useState(null);

    // Keyboard shortcut for QuickLook
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space' && hoveredFileId && !previewFile) {
                e.preventDefault();
                const file = filteredFiles.find(f => f.id === hoveredFileId);
                if (file) setPreviewFile(file);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hoveredFileId, previewFile, filteredFiles]);

    return (
        <div
            className={`min-h-[500px] relative transition-all duration-300 pb-20 ${isFileDragging ? 'bg-zinc-950/50' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsFileDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsFileDragging(false); }}
            onDrop={(e) => {
                e.preventDefault();
                setIsFileDragging(false);
                if (handleFileDrop) {
                    handleFileDrop(e);
                } else {
                    handleFileUploadWithFeedback(e);
                }
            }}
        >
            {/* Upload Overlay */}
            {(isFileDragging || isUploading) && (
                <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-md rounded-lg border border-white/10 m-4">
                    {isUploading ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 rounded-full border-2 border-t-white border-zinc-800 animate-spin" />
                            <div className="animate-pulse text-white text-xs uppercase tracking-[0.2em] font-bold">Processando Upload...</div>
                        </div>
                    ) : (
                        <div className="text-center animate-pulse p-10 border-2 border-dashed border-white/20 rounded-xl">
                            <Upload className="w-12 h-12 text-white mx-auto mb-6" />
                            <p className="text-white font-mono text-sm uppercase tracking-[0.5em] font-bold">Solte arquivos aqui</p>
                        </div>
                    )}
                </div>
            )}

            {/* Header Files Styled */}
            <PrismaticPanel className="mb-4 mx-1" contentClassName="flex flex-col md:flex-row justify-between items-start md:items-center p-6 gap-4">
                <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Central de Arquivos</h3>
                    <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mt-1">
                        {files.length} ARQUIVOS • {folders?.length || 0} PASTAS • {formatFileSize(files.reduce((acc, f) => acc + f.size, 0))} TOTAL
                    </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <MechButton
                        icon={FolderPlus}
                        onClick={() => setIsCreateFolderOpen(true)}
                        className="flex-1 md:flex-none justify-center"
                    >
                        Pasta
                    </MechButton>
                    <div className="relative flex-1 md:flex-none">
                        <Input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            multiple
                            onChange={handleFileUploadWithFeedback}
                        />
                        <MechButton primary icon={Upload} className="w-full justify-center">
                            Arquivo
                        </MechButton>
                    </div>
                </div>
            </PrismaticPanel>

            {/* Breadcrumb */}
            {currentFolderPath && currentFolderPath.length > 1 && (
                <FolderBreadcrumb
                    path={currentFolderPath}
                    onNavigate={navigateToFolder}
                />
            )}

            {/* Filter Bar */}
            <FileFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
                sortBy={sortBy}
                onSortByChange={setSortBy}
                fileCount={filteredFiles.length + (filteredFolders?.length || 0)}
                onClearFilters={() => {
                    setSearchQuery('');
                    setTypeFilter('all');
                    setSortBy('newest');
                }}
            />


            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 px-1">
                <AnimatePresence>
                    {/* Folders First */}
                    {filteredFolders?.map(folder => (
                        <FolderCard
                            key={folder.id}
                            folder={folder}
                            onDoubleClick={navigateToFolder}
                            onRename={handleRenameFolder}
                            onDelete={handleDeleteFolder}
                            onChangeColor={handleChangeFolderColor}
                            onDrop={handleMoveFile}
                            onDragEnter={() => setDragOverFolderId(folder.id)}
                            onDragLeave={() => setDragOverFolderId(null)}
                            isDragOver={dragOverFolderId === folder.id}
                        />
                    ))}

                    {/* Files */}
                    {filteredFiles.map(file => (
                        <motion.div
                            key={file.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.setData('fileId', file.id);
                            }}
                            onMouseEnter={() => setHoveredFileId(file.id)}
                            onMouseLeave={() => setHoveredFileId(null)}
                            onClick={() => setPreviewFile(file)}
                            className="group relative aspect-square cursor-pointer"
                        >
                            {/* Card Container */}
                            <div className="absolute inset-0 glass-panel border-zinc-800 hover:border-zinc-500 bg-black/40 hover:bg-white/5 transition-all flex flex-col items-center justify-center overflow-hidden">

                                {/* Botões de Ação Overlay */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex gap-2">
                                    <button
                                        className="h-7 w-7 flex items-center justify-center bg-black/50 hover:bg-red-900/80 rounded border border-white/10 text-white transition-colors backdrop-blur-sm cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteFile(file.id);
                                        }}
                                        title="Excluir"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                {/* Preview do Conteúdo */}
                                <div className="w-full h-full flex items-center justify-center opacity-60 group-hover:opacity-100 transition-all duration-300">
                                    {file.type?.includes('image') ? (
                                        <img src={file.data} alt={file.name} className="w-full h-full object-cover" />
                                    ) : file.type?.includes('pdf') ? (
                                        <FileText className="w-12 h-12 text-zinc-400 group-hover:text-red-500 transition-colors" />
                                    ) : file.type?.includes('audio') ? (
                                        <Music className="w-12 h-12 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                                    ) : file.type?.includes('video') ? (
                                        <Video className="w-12 h-12 text-zinc-400 group-hover:text-blue-500 transition-colors" />
                                    ) : (
                                        <FileText className="w-12 h-12 text-zinc-400 group-hover:text-white transition-colors" />
                                    )}
                                </div>

                                {/* Rodapé Metadados */}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/90 border-t border-white/5 p-3 backdrop-blur-md z-10">
                                    <p className="text-[10px] text-white font-bold uppercase tracking-wider truncate mb-1">{file.name}</p>
                                    <div className="flex justify-between items-center">
                                        <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">{formatFileSize(file.size)}</p>
                                        <span className="text-[8px] font-mono text-zinc-600 bg-white/10 px-1 rounded uppercase opacity-0 group-hover:opacity-100 transition-opacity">Espaço</span>
                                    </div>
                                </div>

                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Empty State / Upload Dropzone */}
                {filteredFiles.length === 0 && (filteredFolders?.length || 0) === 0 && (
                    <div className="col-span-full h-80 border-2 border-dashed border-zinc-800 rounded-lg flex flex-col items-center justify-center gap-4 group hover:border-zinc-600 transition-colors bg-white/[0.01]">
                        <div className="w-16 h-16 rounded-full bg-zinc-900 group-hover:bg-zinc-800 flex items-center justify-center transition-colors">
                            <Upload className="w-6 h-6 text-zinc-600 group-hover:text-zinc-300" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest group-hover:text-zinc-300">
                                {files.length === 0 && folders?.length === 0 ? 'Nenhum item encontrado' : 'Nenhum item corresponde aos filtros'}
                            </p>
                            <p className="text-xs text-zinc-700 font-mono uppercase tracking-widest mt-2">
                                {files.length === 0 && folders?.length === 0 ? 'Arraste arquivos ou use os botões acima' : 'Tente ajustar sua busca ou limpar os filtros'}
                            </p>
                            {files.length > 0 && (
                                <MechButton
                                    onClick={() => {
                                        setSearchQuery('');
                                        setTypeFilter('all');
                                        setSortBy('newest');
                                    }}
                                    className="mt-6 mx-auto"
                                    icon={X}
                                >
                                    Limpar Filtros
                                </MechButton>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <QuickLookModal
                file={previewFile}
                isOpen={!!previewFile}
                onClose={() => setPreviewFile(null)}
            />

            <CreateFolderModal
                isOpen={isCreateFolderOpen}
                onClose={() => setIsCreateFolderOpen(false)}
                onCreate={handleCreateFolder}
            />
        </div>
    );
}
