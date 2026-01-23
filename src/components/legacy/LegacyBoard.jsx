import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import MechButton from '../ui/MechButton';

// Refactored Components
import FilesBoard from '../boards/FilesBoard';
import KanbanBoard from '../boards/KanbanBoard';
import GoalsBoard from '../boards/GoalsBoard';

function LegacyBoard({
  data,
  entityName,
  enabledTabs,
  currentBoardType,
  setCurrentBoardType,
  currentSubProject,
  setCurrentView,

  // Drag & Drop
  handleDragOver,
  handleDrop,
  handleDragStart,
  handleDragEnter,
  dragOverTargetId,

  // Handlers
  handleTaskAction,
  setModalState,

  // Files Props
  files,
  filteredFiles,
  folders,
  filteredFolders,
  isFileDragging,
  setIsFileDragging,
  isUploading,
  handleFileDrop,
  handleFileUploadWithFeedback,
  handleDeleteFile,
  handleMoveFile,

  // File Filters
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  sortBy,
  setSortBy,

  // Folder Handlers
  handleCreateFolder,
  handleRenameFolder,
  handleDeleteFolder,
  handleChangeFolderColor,
  currentFolderPath,
  navigateToFolder,
}) {

  // Normalize tabs
  const normalizedTabs = useMemo(() => {
    if (!Array.isArray(enabledTabs)) return [];
    if (typeof enabledTabs[0] === 'string') {
      return enabledTabs.map(t => ({
        id: t,
        title: t === 'kanban' ? 'Kanban' : (t === 'todo' ? 'Lista' : (t === 'goals' ? 'Metas' : (t === 'files' ? 'Arquivos' : t))),
        type: t // Legacy assumption: id matches type
      }));
    }
    return enabledTabs;
  }, [enabledTabs]);

  const currentTab = normalizedTabs.find(t => t.id === currentBoardType) || { type: 'kanban' };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] relative overflow-hidden">
      {/* Grid de Fundo (Abismo) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" style={{ filter: 'contrast(150%) brightness(100%)' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80" />
        <div className="absolute inset-0 opacity-[0.10]" style={{ backgroundImage: "linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)", backgroundSize: '40px 40px', maskImage: 'radial-gradient(circle at center, black, transparent 80%)' }} />
      </div>

      {/* Header & Tabs */}
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
            {normalizedTabs.map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="rounded-none uppercase text-xs font-bold tracking-widest h-full data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b data-[state=active]:border-red-600 text-zinc-600"
              >
                {tab.title}
              </TabsTrigger>
            ))}
            <MechButton
              className="h-full border-none px-2 text-zinc-600 hover:text-white"
              icon={Plus}
              onClick={() => {
                // Prompt for new tab name/type
                const name = prompt("Nome da nova aba:");
                if (name) handleTaskAction('addTab', { title: name });
              }}
            />
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden relative z-10">
        <div className="absolute inset-0 overflow-auto pr-2">

          {/* FILES BOARD */}
          {currentTab.type === 'files' && (
            <FilesBoard
              files={files}
              filteredFiles={filteredFiles}
              folders={folders}
              filteredFolders={filteredFolders}
              isFileDragging={isFileDragging}
              setIsFileDragging={setIsFileDragging}
              isUploading={isUploading}
              handleFileDrop={handleFileDrop}
              handleFileUploadWithFeedback={handleFileUploadWithFeedback}
              handleDeleteFile={handleDeleteFile}
              handleMoveFile={handleMoveFile}
              handleCreateFolder={handleCreateFolder}
              handleRenameFolder={handleRenameFolder}
              handleDeleteFolder={handleDeleteFolder}
              handleChangeFolderColor={handleChangeFolderColor}
              currentFolderPath={currentFolderPath}
              navigateToFolder={navigateToFolder}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
            />
          )}

          {/* KANBAN / TODO BOARD (Generic for custom tabs too) */}
          {(currentTab.type !== 'files' && currentTab.type !== 'goals') && (
            <KanbanBoard
              data={data}
              currentBoardType={currentTab.type} // Pass type so KanbanBoard knows if it's TODO style or KANBAN style
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              handleDragStart={handleDragStart}
              handleDragEnter={handleDragEnter}
              dragOverTargetId={dragOverTargetId}
              handleTaskAction={handleTaskAction}
              setModalState={setModalState}
            />
          )}

          {/* GOALS BOARD */}
          {currentTab.type === 'goals' && (
            <GoalsBoard
              data={data}
              handleTaskAction={handleTaskAction}
              setModalState={setModalState}
            />
          )}

        </div>
      </div>
    </div>
  );
}

export default LegacyBoard;
