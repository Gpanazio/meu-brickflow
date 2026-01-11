import React, { useMemo, useState } from 'react';
import ResponsibleUsersButton from '../ResponsibleUsersButton';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { 
  Upload, ArrowLeft, Plus, Trash2, Eye, FileText, 
  Search, Filter, MoreVertical, CheckSquare, Paperclip, MessageSquare,
  Clock, Calendar as CalendarIcon, Tag, History, Archive
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { formatFileSize } from '../../utils/formatFileSize';

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
  handleListAction,
  isFileDragging,
  setIsFileDragging,
  handleFileDrop,
  isUploading,
  handleFileUploadWithFeedback,
  files,
  handleDeleteFile
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  const filesForSubProject = useMemo(
    () => files?.filter(file => file.subProjectId === (currentSubProject?.id ?? null)) || [],
    [files, currentSubProject?.id]
  );

  const filteredLists = useMemo(() => {
    if (!data.lists) return [];
    return data.lists.map(list => ({
      ...list,
      tasks: list.tasks?.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             task.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
        const matchesArchived = showArchived ? task.isArchived : !task.isArchived;
        return matchesSearch && matchesPriority && matchesArchived;
      }) || []
    }));
  }, [data.lists, searchTerm, filterPriority, showArchived]);

  const getTaskProgress = (task) => {
    if (!task.checklists || task.checklists.length === 0) return null;
    const total = task.checklists.length;
    const completed = task.checklists.filter(i => i.completed).length;
    return { total, completed, percent: Math.round((completed / total) * 100) };
  };

  const getDueDateStatus = (dateStr) => {
    if (!dateStr) return null;
    const dueDate = new Date(dateStr);
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (diff < 0) return 'late';
    if (hours < 24) return 'near';
    return 'ok';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 border-b border-zinc-900 pb-4 gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setCurrentView(currentSubProject ? 'project' : 'home')} className="text-zinc-500 hover:text-white uppercase text-[10px] tracking-widest rounded-none px-0"><ArrowLeft className="mr-2 h-3 w-3" /> Voltar</Button>
          <div className="flex flex-col">
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight leading-none">{entityName}</h2>
            {currentProject && <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest mt-1">{currentProject.name}</span>}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowArchived(!showArchived)}
            className={`h-8 rounded-none uppercase text-[9px] tracking-widest border-zinc-900 ${showArchived ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
          >
            <History className="h-3 w-3 mr-2" /> {showArchived ? 'Ver Ativos' : 'Ver Arquivados'}
          </Button>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-600 group-focus-within:text-red-600 transition-colors" />
            <Input 
              placeholder="FILTRAR TAREFAS..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-9 bg-zinc-950 border-zinc-900 w-48 md:w-64 text-[10px] tracking-widest rounded-none focus:ring-0 focus:border-zinc-700"
            />
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
      </div>

      <div className="flex-1 overflow-hidden relative bg-black">
        <div className="absolute inset-0 overflow-auto pr-2">
          {/* KANBAN */}
          {currentBoardType === 'kanban' && (
            <div className="flex h-full gap-0 border-l border-zinc-900 min-w-max">
              {filteredLists.length > 0 ? filteredLists.map(list => (
                <div key={list.id} className="w-80 flex flex-col h-full bg-black border-r border-zinc-900"
                     onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, list.id, 'list')}>
                  <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-950/20">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[10px] uppercase tracking-[0.2em] text-zinc-400">{list.title}</span>
                      <span className="bg-zinc-900 text-zinc-600 text-[9px] font-mono px-1.5 py-0.5 rounded-sm">{(list.tasks?.length ?? 0).toString().padStart(2, '0')}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-700 hover:text-white rounded-none">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-black border-zinc-800 rounded-none text-zinc-400">
                        <DropdownMenuItem 
                          className="text-[10px] uppercase tracking-widest focus:bg-zinc-900 focus:text-white cursor-pointer"
                          onClick={() => handleListAction('archive-cards', list.id)}
                        >
                          Arquivar Cards
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-[10px] uppercase tracking-widest focus:bg-zinc-900 focus:text-white cursor-pointer">Mover Lista</DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-zinc-900" />
                        <DropdownMenuItem 
                          className="text-[10px] uppercase tracking-widest focus:bg-zinc-900 focus:text-white cursor-pointer text-red-600"
                          onClick={() => {
                            if (window.confirm('Excluir esta lista e todas as tarefas nela?')) {
                              handleListAction('delete-list', list.id);
                            }
                          }}
                        >
                          Excluir Lista
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar bg-black/40">
                    {list.tasks?.map(task => {
                      const progress = getTaskProgress(task);
                      const coverImage = task.attachments?.find(a => a.type?.includes('image'))?.url || task.coverImage;
                      const dueDateStatus = getDueDateStatus(task.endDate);
                      
                      return (
                        <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task, 'task', list.id)}
                              onDragEnter={(e) => handleDragEnter(e, task.id)}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, task.id, 'task')}
                              onClick={() => setModalState({ type: 'task', mode: 'edit', isOpen: true, data: task, listId: list.id })}
                              className={`bg-zinc-950 border border-zinc-900 hover:border-zinc-700 cursor-grab active:cursor-grabbing group transition-all duration-200 shadow-sm hover:shadow-md 
                                ${dragOverTargetId === task.id ? 'border-t-2 border-t-red-600 scale-[1.02]' : ''} 
                                ${task.isArchived ? 'opacity-60' : ''}
                                ${dueDateStatus === 'late' ? 'border-l-2 border-l-red-600' : dueDateStatus === 'near' ? 'border-l-2 border-l-yellow-500' : ''}
                              `}>
                          
                          {coverImage && (
                            <div className="w-full h-32 overflow-hidden border-b border-zinc-900">
                              <img src={coverImage} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                          )}

                          <div className="p-4 space-y-3">
                            <div className="flex flex-wrap gap-1 mb-1">
                              {task.labels?.map((label, idx) => (
                                <div key={idx} className={`h-1.5 w-8 rounded-full bg-${label.color}-600`} title={label.text} />
                              ))}
                              {task.priority === 'high' && <div className="h-1.5 w-8 rounded-full bg-red-600" title="Alta Prioridade" />}
                            </div>

                            <div className="flex justify-between items-start gap-2">
                              <span className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors uppercase leading-tight tracking-wide">{task.title}</span>
                              {task.isArchived && <Badge variant="outline" className="text-[8px] h-4 rounded-none border-zinc-800 text-zinc-600 uppercase">Arquivado</Badge>}
                            </div>

                            {(task.description || progress || task.attachments?.length > 0 || task.comments?.length > 0) && (
                              <div className="flex flex-wrap items-center gap-3 text-zinc-600">
                                {task.description && <FileText className="h-3 w-3" />}
                                {progress && (
                                  <div className="flex items-center gap-1 bg-green-950/30 px-1.5 py-0.5 rounded text-green-600 border border-green-900/30">
                                    <CheckSquare className="h-2.5 w-2.5" />
                                    <span className="text-[9px] font-bold">{progress.completed}/{progress.total}</span>
                                  </div>
                                )}
                                {task.attachments?.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Paperclip className="h-3 w-3" />
                                    <span className="text-[9px] font-mono">{task.attachments.length}</span>
                                  </div>
                                )}
                                {task.comments?.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    <span className="text-[9px] font-mono">{task.comments.length}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {progress && (
                              <div className="space-y-1">
                                <Progress value={progress.percent} className="h-1 bg-zinc-900" />
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-3 border-t border-zinc-900/50">
                              <div className="flex -space-x-2 overflow-hidden">
                                {task.responsibleUsers?.length > 0 ? (
                                  <ResponsibleUsersButton users={task.responsibleUsers} />
                                ) : (
                                  <div className="h-6 w-6 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                    <MoreVertical className="h-3 w-3 text-zinc-700" />
                                  </div>
                                )}
                              </div>
                              {task.endDate && (
                                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                                  dueDateStatus === 'late' ? 'bg-red-950/50 text-red-500 border border-red-900/30' : 
                                  dueDateStatus === 'near' ? 'bg-yellow-950/50 text-yellow-500 border border-yellow-900/30' : 
                                  'text-zinc-500'
                                }`}>
                                  <Clock className="h-2.5 w-2.5" />
                                  <span className="text-[9px] font-mono">{new Date(task.endDate).toLocaleDateString().slice(0,5)} {task.endDate.includes('T') ? new Date(task.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                </div>
                              )}
                            </div>
                          </div>
                      </div>
                    );
                  })}
                  <Button variant="ghost" className="m-3 border border-dashed border-zinc-900 text-zinc-700 hover:text-white hover:bg-zinc-950 rounded-none h-10 uppercase text-[9px] tracking-widest"
                    onClick={() => setModalState({ type: 'task', mode: 'create', isOpen: true, data: { listId: list.id } })}>
                    <Plus className="h-3 w-3 mr-2" /> Adicionar Card
                  </Button>
                </div>
              </div>
              )) : <div className="p-8 text-zinc-500 text-xs">Nenhum card encontrado com esses filtros.</div>}
              <Button 
                variant="ghost" 
                className="w-72 h-12 m-4 border border-dashed border-zinc-900 text-zinc-700 hover:text-white hover:bg-zinc-950 rounded-none uppercase text-[10px] tracking-widest shrink-0"
                onClick={() => handleListAction('add-list')}
              >
                <Plus className="h-4 w-4 mr-2" /> Nova Lista
              </Button>
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
                {filesForSubProject.map(file => (
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
