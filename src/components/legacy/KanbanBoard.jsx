import React, { useMemo, useState } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  horizontalListSortingStrategy, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  MoreVertical, CheckSquare, Paperclip, MessageSquare,
  Clock, Plus, FileText
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import ResponsibleUsersButton from '../ResponsibleUsersButton';
import { useProjectStore } from '../../store/useProjectStore';

// --- COMPONENTS ---

// 1. Task Card Component
const TaskCard = ({ task, listId, setModalState, isDragging }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id, data: { type: 'task', task, listId } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : (task.isArchived ? 0.6 : 1),
  };

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

  const progress = getTaskProgress(task);
  const coverImage = task.attachments?.find(a => a.type?.includes('image'))?.url || task.coverImage;
  const dueDateStatus = getDueDateStatus(task.endDate);

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={() => setModalState({ type: 'task', mode: 'edit', isOpen: true, data: task, listId })}
      className={`bg-zinc-950 border border-zinc-900 hover:border-zinc-700 cursor-grab active:cursor-grabbing group transition-all duration-200 shadow-sm hover:shadow-md mb-3
        ${task.isArchived ? 'opacity-60' : ''}
        ${dueDateStatus === 'late' ? 'border-l-2 border-l-red-600' : dueDateStatus === 'near' ? 'border-l-2 border-l-yellow-500' : ''}
      `}
    >
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
};

// 2. Sortable List Component
const SortableList = ({ list, tasks, setModalState, handleListAction }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: list.id, data: { type: 'list', list } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="w-80 flex flex-col h-full bg-black border-r border-zinc-900 shrink-0">
      <div 
        className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-950/20 cursor-grab active:cursor-grabbing"
        {...attributes} {...listeners}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-[10px] uppercase tracking-[0.2em] text-zinc-400">{list.title}</span>
          <span className="bg-zinc-900 text-zinc-600 text-[9px] font-mono px-1.5 py-0.5 rounded-sm">{(tasks?.length ?? 0).toString().padStart(2, '0')}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-700 hover:text-white rounded-none" onPointerDown={e => e.stopPropagation()}>
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
      
      <div className="flex-1 p-3 overflow-y-auto custom-scrollbar bg-black/40">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} listId={list.id} setModalState={setModalState} />
          ))}
        </SortableContext>
        <Button variant="ghost" className="w-full mt-2 border border-dashed border-zinc-900 text-zinc-700 hover:text-white hover:bg-zinc-950 rounded-none h-10 uppercase text-[9px] tracking-widest"
          onClick={() => setModalState({ type: 'task', mode: 'create', isOpen: true, data: { listId: list.id } })}>
          <Plus className="h-3 w-3 mr-2" /> Adicionar Card
        </Button>
      </div>
    </div>
  );
};

// 3. Main Board Component
const KanbanBoard = ({ lists, setModalState, handleListAction }) => {
  const { moveTask, updateProjects } = useProjectStore();
  const [activeId, setActiveId] = useState(null);
  const [activeData, setActiveData] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragStart = (event) => {
    setActiveId(event.active.id);
    setActiveData(event.active.data.current);
  };

  const onDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'task';
    const isOverTask = over.data.current?.type === 'task';
    const isOverList = over.data.current?.type === 'list';

    if (!isActiveTask) return;

    // Moving task over another task
    if (isActiveTask && isOverTask) {
        // Logic handled by onDragEnd usually, but for visual updates dnd-kit handles it via SortableContext if in same container
        // If different container, we need to move it visually?
        // Dnd-kit handles visual feedback automatically.
    }
  };

  const onDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveData(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    
    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType === 'list' && overType === 'list' && activeId !== overId) {
        // Reorder lists (not implemented in store yet)
        // const oldIndex = lists.findIndex(l => l.id === activeId);
        // const newIndex = lists.findIndex(l => l.id === overId);
        // updateProjects(projects => ... move list ...);
        return;
    }

    if (activeType === 'task') {
        const activeListId = active.data.current.listId;
        
        let overListId;
        let newIndex;

        if (overType === 'list') {
            overListId = overId;
            newIndex = lists.find(l => l.id === overId)?.tasks.length || 0; // Add to end
        } else if (overType === 'task') {
            overListId = over.data.current.listId;
            const overList = lists.find(l => l.id === overListId);
            const overTaskIndex = overList.tasks.findIndex(t => t.id === overId);
            
            // Determine if above or below
            // For simplicity, just insert at index
            newIndex = overTaskIndex; 
            // If dragging downwards in same list, index might need adjustment
            // But store.moveTask handles "remove then insert". 
            // So if I insert at index 5, and removed from 2, it becomes 5.
            
            // Let's rely on arrayMove logic if same list?
            if (activeListId === overListId) {
                const oldIndex = overList.tasks.findIndex(t => t.id === activeId);
                // We use arrayMove logic mentally
                // But store.moveTask uses splice
                // We just need to pass the target index
                if (active.rect.current.translated && active.rect.current.translated.top > over.rect.current.top) {
                    newIndex = overTaskIndex + 1;
                }
            }
        }

        if (activeListId && overListId) {
             moveTask(activeListId, overListId, activeId, newIndex ?? 0);
        }
    }
  };

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCorners} 
      onDragStart={onDragStart} 
      onDragOver={onDragOver} 
      onDragEnd={onDragEnd}
    >
      <div className="flex h-full gap-0 border-l border-zinc-900 min-w-max">
        <SortableContext items={lists.map(l => l.id)} strategy={horizontalListSortingStrategy}>
          {lists.map(list => (
            <SortableList 
              key={list.id} 
              list={list} 
              tasks={list.tasks || []} 
              setModalState={setModalState}
              handleListAction={handleListAction}
            />
          ))}
        </SortableContext>
        <Button 
          variant="ghost" 
          className="w-72 h-12 m-4 border border-dashed border-zinc-900 text-zinc-700 hover:text-white hover:bg-zinc-950 rounded-none uppercase text-[10px] tracking-widest shrink-0"
          onClick={() => handleListAction('add-list')}
        >
          <Plus className="h-4 w-4 mr-2" /> Nova Lista
        </Button>
      </div>
      <DragOverlay>
        {activeId && activeData?.type === 'task' ? (
           <div className="opacity-80 rotate-2 scale-105">
             <TaskCard task={activeData.task} listId={activeData.listId} setModalState={() => {}} isDragging />
           </div>
        ) : null}
        {activeId && activeData?.type === 'list' ? (
           <div className="opacity-80 rotate-2 h-full bg-zinc-900 w-80 border border-zinc-700 p-4">
              <span className="font-bold text-white uppercase">{activeData.list.title}</span>
           </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
