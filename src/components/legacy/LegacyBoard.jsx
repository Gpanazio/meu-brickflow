import { useMemo, useState, useEffect } from 'react';
import ResponsibleUsersButton from '../ResponsibleUsersButton';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Checkbox } from '../ui/checkbox';
import { Upload, ArrowLeft, Plus, Trash2, Eye, FileText, GripVertical, Music, Video, FolderPlus, X } from 'lucide-react';
import { formatFileSize } from '../../utils/formatFileSize';
import { AnimatePresence, motion } from 'framer-motion';
import MechButton from '../ui/MechButton';
import StatusLED from '../ui/StatusLED';
import PrismaticPanel from '../ui/PrismaticPanel';
import FileFilterBar from '../FileFilterBar';
import FolderCard from '../FolderCard';
import FolderBreadcrumb from '../FolderBreadcrumb';
import CreateFolderModal from '../CreateFolderModal';
import { QuickLookModal } from '../ui/QuickLookModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

function LegacyBoard({
  data,
  entityName,
  enabledTabs,
  currentBoardType,
  setCurrentBoardType,
  currentSubProject,
  // currentProject kept for prop consistency,
  setCurrentView,
  handleDragOver,
  handleDrop,
  handleDragStart,
  handleDragEnter,
  setModalState,
  dragOverTargetId,
  handleTaskAction,
  isFileDragging,
  setIsFileDragging,
  handleFileDrop,
  isUploading,
  handleFileUploadWithFeedback,
  files,
  filteredFiles,
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  sortBy,
  setSortBy,
  handleDeleteFile,
  handleMoveFile,
  // Folders
  folders,
  filteredFolders,
  currentFolderId,
  currentFolder,
  currentFolderPath,
  navigateToFolder,
  navigateUp,
  handleCreateFolder,
  handleRenameFolder,
  handleDeleteFolder,
  handleChangeFolderColor
}) {
  const [hoveredFileId, setHoveredFileId] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverListId, setDragOverListId] = useState(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [dragOverFolderId, setDragOverFolderId] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && hoveredFileId && currentBoardType === 'files' && !previewFile) {
        e.preventDefault();
        const file = filteredFiles.find(f => f.id === hoveredFileId);
        if (file) setPreviewFile(file);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredFileId, currentBoardType, previewFile]);


  const todoListIds = useMemo(() => {
    if (currentBoardType !== 'todo') return { doneListId: null, defaultListId: null };
    const lists = Array.isArray(data?.lists) ? data.lists : [];
    if (lists.length === 0) return { doneListId: null, defaultListId: null };

    const normalize = (value) => String(value || '').trim().toLowerCase();

    const done =
      lists.find((l) => normalize(l.id) === 'l3') ||
      lists.find((l) => normalize(l.title).includes('conclu')) ||
      lists[lists.length - 1];

    const defaults = lists.find((l) => normalize(l.id) === 'l1') || lists[0];

    return {
      doneListId: done?.id || null,
      defaultListId: defaults?.id || null
    };
  }, [currentBoardType, data?.lists]);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] relative overflow-hidden">
      {/* Grid de Fundo (Abismo) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" style={{ filter: 'contrast(150%) brightness(100%)' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80" />
        <div className="absolute inset-0 opacity-[0.10]" style={{ backgroundImage: "linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)", backgroundSize: '40px 40px', maskImage: 'radial-gradient(circle at center, black, transparent 80%)' }} />
      </div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-zinc-900 pb-4 gap-4">
        <div className="flex items-center gap-4">
          <MechButton
            onClick={() => setCurrentView(currentSubProject ? 'project' : 'home')}
            className="h-8 px-3"
            icon={ArrowLeft}
          >
            Voltar
          </MechButton>
          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight truncate max-w-[200px] md:max-w-none">{entityName}</h2>
        </div>
        <Tabs value={currentBoardType} onValueChange={setCurrentBoardType} className="w-full md:w-auto">
          <TabsList className="bg-transparent border-b border-transparent rounded-none h-8 p-0 gap-4 w-full md:w-auto overflow-x-auto justify-start md:justify-center scrollbar-hide">
            {enabledTabs.includes('kanban') && <TabsTrigger value="kanban" className="rounded-none uppercase text-xs font-bold tracking-widest h-full data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b data-[state=active]:border-red-600 text-zinc-600">Kanban</TabsTrigger>}
            {enabledTabs.includes('todo') && <TabsTrigger value="todo" className="rounded-none uppercase text-xs font-bold tracking-widest h-full data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b data-[state=active]:border-red-600 text-zinc-600">Lista</TabsTrigger>}
            {enabledTabs.includes('files') && <TabsTrigger value="files" className="rounded-none uppercase text-xs font-bold tracking-widest h-full data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b data-[state=active]:border-red-600 text-zinc-600">Arquivos</TabsTrigger>}
            {enabledTabs.includes('goals') && <TabsTrigger value="goals" className="rounded-none uppercase text-xs font-bold tracking-widest h-full data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b data-[state=active]:border-red-600 text-zinc-600">Metas</TabsTrigger>}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden relative z-10">
        <div className="absolute inset-0 overflow-auto pr-2">
          {/* KANBAN */}
          {currentBoardType === 'kanban' && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.05 } }
              }}
              className="flex h-full gap-0 border-l border-zinc-900 min-w-max"
            >
              {data.lists ? data.lists.map(list => (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, x: 20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                  key={list.id} className={`w-72 flex flex-col h-full bg-black border-r border-zinc-900 transition-colors ${dragOverListId === list.id ? 'bg-zinc-900/50' : ''}`}
                  onDragOver={(e) => {
                    handleDragOver(e);
                    setDragOverListId(list.id);
                  }}
                  onDragLeave={() => setDragOverListId(null)}
                  onDrop={(e) => {
                    handleDrop(e, list.id, 'list');
                    setDragOverListId(null);
                    setDraggingId(null);
                  }}
                >
                  <div
                    className={`p-4 border-b border-zinc-900 flex justify-between items-center cursor-grab active:cursor-grabbing group/header ${draggingId === list.id ? 'opacity-40' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      handleDragStart(e, list, 'list');
                      setDraggingId(list.id);
                    }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, list.id, 'list')}
                    onDragEnd={() => setDraggingId(null)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <GripVertical className="h-3 w-3 text-zinc-700 opacity-0 group-hover/header:opacity-100 transition-opacity" />
                      <input
                        className="bg-transparent border-none font-bold text-sm uppercase tracking-[0.2em] text-zinc-500 focus:text-white focus:outline-none w-full"
                        defaultValue={list.title}
                        onBlur={(e) => {
                          if (e.target.value !== list.title) {
                            handleTaskAction('updateColumn', { listId: list.id, updates: { title: e.target.value } });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.target.blur();
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="h-8 w-8 flex items-center justify-center rounded-none border border-transparent hover:border-red-900/50 hover:bg-red-950/20 text-zinc-800 hover:text-red-600 transition-all group/del"
                            title="Excluir Coluna"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="glass-panel border-zinc-800 rounded-none bg-black/90">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white uppercase tracking-tighter font-black">Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
                              Esta ação não pode ser desfeita. Isso excluirá permanentemente a coluna "{list.title}" e todas as tarefas vinculadas.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-none border-zinc-800 bg-transparent text-zinc-500 hover:bg-zinc-900 hover:text-white uppercase text-[10px] font-bold tracking-widest h-10">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleTaskAction('deleteColumn', { listId: list.id })}
                              className="rounded-none bg-red-600 hover:bg-red-700 text-white uppercase text-[10px] font-bold tracking-widest h-10"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div
                    className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar bg-black"
                    onDragOver={handleDragOver}
                    onDrop={(e) => {
                      handleDrop(e, list.id, 'list');
                      setDraggingId(null);
                    }}
                  >
                    <AnimatePresence>
                      {list.tasks?.map(task => (
                        <motion.div
                          key={task.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          draggable
                          onDragStart={(e) => {
                            handleDragStart(e, task, 'task', list.id);
                            setDraggingId(task.id);
                          }}
                          onDragEnd={() => setDraggingId(null)}
                          onDragEnter={(e) => handleDragEnter(e, task.id, list.id)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDrop(e, list.id, 'list');
                            setDraggingId(null);
                          }}
                          onClick={() => setModalState({ type: 'task', mode: 'edit', isOpen: true, data: task, listId: list.id })}
                          className={`bg-zinc-950 border border-zinc-900 hover:border-zinc-700 cursor-grab active:cursor-grabbing p-4 group transition-all relative ${dragOverTargetId === task.id ? 'before:content-[""] before:absolute before:-top-[2px] before:left-0 before:right-0 before:h-[2px] before:bg-red-600 before:shadow-[0_0_8px_rgba(220,38,38,0.8)]' : ''} ${draggingId === task.id ? 'opacity-40 grayscale' : ''}`}
                        >
                          <div className="flex justify-between items-start mb-2 gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <GripVertical className="h-3 w-3 text-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors uppercase leading-tight truncate">{task.title}</span>
                            </div>
                            {task.priority === 'high' && <StatusLED color="red" size="sm" className="shrink-0" />}
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-zinc-900/50 mt-2">
                            {task.responsibleUsers?.length > 0 && <ResponsibleUsersButton users={task.responsibleUsers} />}
                            {task.endDate && <span className="text-xs text-zinc-600 font-mono font-medium">{new Date(task.endDate).toLocaleDateString().slice(0, 5)}</span>}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <MechButton
                      className="w-full border-dashed border-zinc-900 text-zinc-700 hover:text-white hover:bg-zinc-950 h-10"
                      icon={Plus}
                      onClick={() => setModalState({ type: 'task', mode: 'create', isOpen: true, data: { listId: list.id } })}
                    >
                      Adicionar
                    </MechButton>
                  </div>
                </motion.div>
              )) : <div className="p-8 text-zinc-500 text-xs">Nenhum dado encontrado para este quadro.</div>}

              <div className="w-72 flex flex-col h-full bg-black/50 border-r border-zinc-900 items-center justify-center p-6">
                <MechButton
                  className="w-full border-dashed border-zinc-800 text-zinc-600 hover:text-white hover:bg-zinc-950 h-12"
                  icon={Plus}
                  onClick={() => handleTaskAction('addColumn', { title: 'Nova Coluna' })}
                >
                  Nova Coluna
                </MechButton>
              </div>
            </motion.div>
          )}

          {/* TODO LIST */}
          {currentBoardType === 'todo' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              {data.lists ? data.lists.map(list => (
                <div
                  key={list.id}
                  className={`space-y-0 transition-opacity ${draggingId === list.id ? 'opacity-40' : ''}`}
                >
                  <div
                    className="cursor-grab active:cursor-grabbing group/header"
                    draggable
                    onDragStart={(e) => {
                      handleDragStart(e, list, 'list');
                      setDraggingId(list.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => {
                      handleDrop(e, list.id, 'list');
                      setDraggingId(null);
                    }}
                  >
                    <div className="flex items-center justify-between mb-2 pl-4 border-l-2 border-red-600 group">
                      <div className="flex items-center gap-2 flex-1">
                        <GripVertical className="h-3 w-3 text-zinc-800 opacity-0 group-hover/header:opacity-100 transition-opacity" />
                        <input
                          className="bg-transparent border-none text-sm font-bold text-zinc-600 uppercase tracking-[0.3em] focus:text-white focus:outline-none w-full"
                          defaultValue={list.title}
                          onBlur={(e) => {
                            if (e.target.value !== list.title) {
                              handleTaskAction('updateColumn', { listId: list.id, updates: { title: e.target.value } });
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.target.blur();
                          }}
                        />
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="h-8 w-8 flex items-center justify-center rounded-none border border-transparent hover:border-red-900/50 hover:bg-red-950/20 text-zinc-800 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="glass-panel border-zinc-800 rounded-none bg-black/90">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white uppercase tracking-tighter font-black">Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
                              Esta ação não pode ser desfeita. Isso excluirá permanentemente a lista "{list.title}" e todas as tarefas vinculadas.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-none border-zinc-800 bg-transparent text-zinc-500 hover:bg-zinc-900 hover:text-white uppercase text-[10px] font-bold tracking-widest h-10">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleTaskAction('deleteColumn', { listId: list.id })}
                              className="rounded-none bg-red-600 hover:bg-red-700 text-white uppercase text-[10px] font-bold tracking-widest h-10"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div className="bg-black border-t border-zinc-900">
                    <AnimatePresence>
                      {list.tasks?.map(task => (
                        <motion.div
                          key={task.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="p-3 flex items-center gap-4 border-b border-zinc-900 hover:bg-zinc-950/50 transition-colors group"
                        >
                          <Checkbox
                            checked={todoListIds.doneListId ? list.id === todoListIds.doneListId : false}
                            onCheckedChange={(checked) => {
                              const isChecked = checked === true;
                              const targetListId = isChecked ? todoListIds.doneListId : todoListIds.defaultListId;
                              if (!targetListId || targetListId === list.id) return;
                              handleTaskAction('move', { taskId: task.id, fromListId: list.id, toListId: targetListId });
                            }}
                            className="border-zinc-800 data-[state=checked]:bg-white data-[state=checked]:text-black rounded-none w-4 h-4"
                          />
                          <div className="flex-1 cursor-pointer" onClick={() => setModalState({ type: 'task', mode: 'edit', isOpen: true, data: task, listId: list.id })}>
                            <p className="text-base font-medium text-zinc-300 group-hover:text-white transition-colors uppercase tracking-wide">{task.title}</p>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-4">
                            <span className="text-xs font-mono uppercase text-zinc-600 font-medium">{task.priority}</span>
                            <button
                              className="h-8 w-8 flex items-center justify-center text-zinc-700 hover:text-red-600 transition-colors glitch-hover"
                              onClick={() => handleTaskAction('delete', { taskId: task.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <MechButton
                      className="w-full text-zinc-600 hover:text-white justify-start h-10 px-4 border-0 hover:bg-zinc-950"
                      icon={Plus}
                      onClick={() => setModalState({ type: 'task', mode: 'create', isOpen: true, data: { listId: list.id } })}
                    >
                      Inserir Dados
                    </MechButton>
                  </div>
                </div>
              )) : <div className="p-8 text-zinc-500 text-xs">Lista não inicializada.</div>}

              <div className="flex justify-center p-8">
                <MechButton
                  className="border-dashed border-zinc-800 text-zinc-600 hover:text-white hover:bg-zinc-950 h-12 px-8"
                  icon={Plus}
                  onClick={() => handleTaskAction('addColumn', { title: 'Nova Lista' })}
                >
                  Nova Lista
                </MechButton>
              </div>
            </motion.div>
          )}

          {/* FILES VIEW REFINED */}
          {currentBoardType === 'files' && (
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
                            className="h-7 w-7 flex items-center justify-center bg-black/50 hover:bg-red-900/80 rounded border border-white/10 text-white transition-colors backdrop-blur-sm"
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
                {filteredFiles.length === 0 && (
                  <div className="col-span-full h-80 border-2 border-dashed border-zinc-800 rounded-lg flex flex-col items-center justify-center gap-4 group hover:border-zinc-600 transition-colors bg-white/[0.01]">
                    <div className="w-16 h-16 rounded-full bg-zinc-900 group-hover:bg-zinc-800 flex items-center justify-center transition-colors">
                      <Upload className="w-6 h-6 text-zinc-600 group-hover:text-zinc-300" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest group-hover:text-zinc-300">
                        {files.length === 0 ? 'Nenhum arquivo encontrado' : 'Nenhum arquivo corresponde aos filtros'}
                      </p>
                      <p className="text-xs text-zinc-700 font-mono uppercase tracking-widest mt-2">
                        {files.length === 0 ? 'Arraste arquivos ou use o botão adicionar' : 'Tente ajustar sua busca ou limpar os filtros'}
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
          )}
        </div>
      </div>
    </div>
  );
}

export default LegacyBoard;
