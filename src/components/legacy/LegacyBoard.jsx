import React from 'react';
import ResponsibleUsersButton from '../ResponsibleUsersButton';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Checkbox } from '../ui/checkbox';
import { Upload, ArrowLeft, Plus, Trash2, Eye, FileText } from 'lucide-react';
import { formatFileSize } from '../../utils/formatFileSize';

const FormattedDate = React.memo(({ dateString }) => {
  if (!dateString) return null;
  const formatted = new Date(dateString).toLocaleDateString().slice(0, 5);
  return <span className="text-[9px] text-zinc-600 font-mono">{formatted}</span>;
});

function LegacyBoard({
  data,
  entityName,
  enabledTabs,
  currentBoardType,
  setCurrentBoardType,
  currentSubProject,
  currentProject,
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
  handleDeleteFile
}) {
  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-zinc-900 pb-4 gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setCurrentView(currentSubProject ? 'project' : 'home')} className="text-zinc-500 hover:text-white uppercase text-[10px] tracking-widest rounded-none px-0"><ArrowLeft className="mr-2 h-3 w-3" /> Voltar</Button>
          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">{entityName}</h2>
        </div>
        <Tabs value={currentBoardType} onValueChange={setCurrentBoardType}>
          <TabsList className="bg-transparent border-b border-transparent rounded-none h-8 p-0 gap-4">
            {enabledTabs.includes('kanban') && <TabsTrigger value="kanban" className="rounded-none uppercase text-[10px] font-bold tracking-widest h-full data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b data-[state=active]:border-red-600 text-zinc-600">Kanban</TabsTrigger>}
            {enabledTabs.includes('todo') && <TabsTrigger value="todo" className="rounded-none uppercase text-[10px] font-bold tracking-widest h-full data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b data-[state=active]:border-red-600 text-zinc-600">Lista</TabsTrigger>}
            {enabledTabs.includes('files') && <TabsTrigger value="files" className="rounded-none uppercase text-[10px] font-bold tracking-widest h-full data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b data-[state=active]:border-red-600 text-zinc-600">Arquivos</TabsTrigger>}
            {enabledTabs.includes('goals') && <TabsTrigger value="goals" className="rounded-none uppercase text-[10px] font-bold tracking-widest h-full data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b data-[state=active]:border-red-600 text-zinc-600">Metas</TabsTrigger>}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden relative bg-black">
        <div className="absolute inset-0 overflow-auto pr-2">
          {/* KANBAN */}
          {currentBoardType === 'kanban' && (
            <div className="flex h-full gap-0 border-l border-zinc-900 min-w-max">
              {data.lists ? data.lists.map(list => (
                <div key={list.id} className="w-72 flex flex-col h-full bg-black border-r border-zinc-900"
                     onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, list.id, 'list')}>
                  <div className="p-4 border-b border-zinc-900 flex justify-between items-center">
                    <span className="font-bold text-[10px] uppercase tracking-[0.2em] text-zinc-500">{list.title}</span>
                    <span className="text-zinc-700 text-[10px] font-mono">{list.tasks?.length.toString().padStart(2, '0') || '00'}</span>
                  </div>
                  <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar bg-black">
                    {list.tasks?.map(task => (
                      <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task, 'task', list.id)}
                            onDragEnter={(e) => handleDragEnter(e, task.id)}
                            onClick={() => setModalState({ type: 'task', mode: 'edit', isOpen: true, data: task, listId: list.id })}
                            className={`bg-zinc-950 border border-zinc-900 hover:border-zinc-700 cursor-grab active:cursor-grabbing p-4 group transition-all ${dragOverTargetId === task.id ? 'border-t-2 border-t-red-600' : ''}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors uppercase leading-tight">{task.title}</span>
                          {task.priority === 'high' && <div className="h-1 w-1 bg-red-600 shrink-0" />}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-900/50 mt-2">
                          {task.responsibleUsers?.length > 0 && <ResponsibleUsersButton users={task.responsibleUsers} />}
                          <FormattedDate dateString={task.endDate} />
                        </div>
                    </div>
                  ))}
                  <Button variant="ghost" className="w-full border border-dashed border-zinc-900 text-zinc-700 hover:text-white hover:bg-zinc-950 rounded-none h-10 uppercase text-[9px] tracking-widest"
                    onClick={() => setModalState({ type: 'task', mode: 'create', isOpen: true, data: { listId: list.id } })}>
                    <Plus className="h-3 w-3 mr-2" /> Adicionar
                  </Button>
                </div>
              </div>
            )) : <div className="p-8 text-zinc-500 text-xs">Nenhum dado encontrado para este quadro.</div>}
            </div>
          )}

          {/* TODO LIST */}
          {currentBoardType === 'todo' && (
            <div className="max-w-4xl mx-auto space-y-8">
              {data.lists ? data.lists.map(list => (
                <div key={list.id} className="space-y-0">
                  <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-2 pl-4 border-l-2 border-red-600">{list.title}</h3>
                  <div className="bg-black border-t border-zinc-900">
                    {list.tasks?.map(task => (
                      <div key={task.id} className="p-3 flex items-center gap-4 border-b border-zinc-900 hover:bg-zinc-950/50 transition-colors group">
                        <Checkbox checked={list.title === 'Concluído'} className="border-zinc-800 data-[state=checked]:bg-white data-[state=checked]:text-black rounded-none w-4 h-4" />
                        <div className="flex-1 cursor-pointer" onClick={() => setModalState({ type: 'task', mode: 'edit', isOpen: true, data: task, listId: list.id })}>
                          <p className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors uppercase tracking-wide">{task.title}</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-4">
                          <span className="text-[9px] font-mono uppercase text-zinc-600">{task.priority}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-700 hover:text-red-600 hover:bg-transparent rounded-none" 
                                  onClick={() => handleTaskAction('delete', { taskId: task.id })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button variant="ghost" className="w-full text-[10px] text-zinc-600 hover:text-white justify-start h-10 px-4 uppercase tracking-widest rounded-none hover:bg-zinc-950" onClick={() => setModalState({ type: 'task', mode: 'create', isOpen: true, data: { listId: list.id } })}>
                      <Plus className="h-3 w-3 mr-2" /> Inserir Dados
                    </Button>
                  </div>
                </div>
              )) : <div className="p-8 text-zinc-500 text-xs">Lista não inicializada.</div>}
            </div>
          )}

          {/* FILES */}
          {currentBoardType === 'files' && (
            <div 
              className={`min-h-[400px] relative transition-all duration-300 p-0 ${isFileDragging ? 'bg-zinc-950 border-2 border-dashed border-red-900' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsFileDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsFileDragging(false); }}
              onDrop={handleFileDrop}
            >
              {(isFileDragging || isUploading) && (
                <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/90 backdrop-blur-sm">
                  {isUploading ? (
                     <div className="animate-pulse text-white text-xs uppercase tracking-widest">Carregando...</div>
                  ) : (
                     <div className="text-center animate-pulse">
                        <Upload className="w-8 h-8 text-white mx-auto mb-4" />
                        <p className="text-white font-mono text-xs uppercase tracking-[0.5em]">Solte para Upload</p>
                     </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center bg-zinc-950 p-6 border-b border-zinc-900 mb-6">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Arquivos</h3>
                </div>
                <div className="relative">
                  <Input 
                    type="file" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                    multiple 
                    onChange={handleFileUploadWithFeedback} 
                  />
                  <Button className="bg-white text-black hover:bg-zinc-200 uppercase tracking-widest text-[10px] font-bold rounded-none h-10 px-6">
                    <Upload className="mr-2 h-4 w-4" /> Upload
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-px bg-zinc-900 border border-zinc-900">
                {files?.filter(f => f.subProjectId === (currentSubProject?.id || null)).map(file => (
                  <div key={file.id} className="bg-black hover:bg-zinc-950 transition-all group relative aspect-square flex flex-col items-center justify-center p-4">
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-600 hover:text-red-600 rounded-none" onClick={() => handleDeleteFile(file.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                    <div className="mb-3 opacity-50 group-hover:opacity-100 transition-opacity">
                      {file.type?.includes('image') ? <Eye className="w-6 h-6 text-white"/> : <FileText className="w-6 h-6 text-white"/>}
                    </div>
                    <p className="text-[10px] text-zinc-500 font-mono truncate w-full text-center group-hover:text-white transition-colors">{file.name}</p>
                    <p className="text-[8px] text-zinc-700 uppercase tracking-widest mt-1">{formatFileSize(file.size)}</p>
                    <a href={file.data} download={file.name} className="absolute inset-0 z-10" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LegacyBoard;
