import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { cn } from '@/lib/utils';
import {
  Plus, Trash2, X, CheckSquare,
  MessageSquare, History, AtSign
} from 'lucide-react';
import { LABEL_COLORS, BADGE_COLOR_CLASSES, LABEL_SWATCH_CLASSES } from '@/constants/theme';

function LegacyModal({
  modalState,
  setModalState,
  handlePasswordSubmit,
  handleSaveProject,
  handleTaskAction,
  USER_COLORS,
  isReadOnly,
  users
}) {
  const [taskState, setTaskState] = useState(modalState.data || {});
  const canEdit = !isReadOnly;
  const [auditEvents, setAuditEvents] = useState([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);

  const [dbUsers, setDbUsers] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const commentInputRef = useRef(null);

  const responsibleOptions = useMemo(() => {
    const list = Array.isArray(dbUsers) && dbUsers.length > 0 ? dbUsers : (Array.isArray(users) ? users : []);
    return Array.isArray(list) ? list : [];
  }, [dbUsers, users]);

  useEffect(() => {
    if (showMentions && commentText.includes('@')) {
      const parts = commentText.split(' ');
      const lastPart = parts[parts.length - 1];
      if (lastPart.startsWith('@')) {
        const query = lastPart.slice(1).toLowerCase();
        const filtered = responsibleOptions.filter(u => 
          u.username.toLowerCase().includes(query) || 
          (u.displayName && u.displayName.toLowerCase().includes(query))
        );
        setMentionSuggestions(filtered);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  }, [commentText, responsibleOptions, showMentions]);

  const insertMention = (user) => {
    const parts = commentText.split(' ');
    parts[parts.length - 1] = `@${user.username} `;
    setCommentText(parts.join(' '));
    setShowMentions(false);
    if (commentInputRef.current) commentInputRef.current.focus();
  };

  const renderCommentText = (text) => {
    if (!text) return null;
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="text-red-500 font-bold px-1 bg-red-500/10 rounded-sm">{part}</span>;
      }
      return part;
    });
  };

  useEffect(() => {
    if (modalState.type === 'task') {
      setTaskState(
        modalState.data || {
          checklists: [],
          attachments: [],
          labels: [],
          activity: [],
          comments: [],
          responsibleUsers: []
        }
      );
    }
  }, [modalState]);

  useEffect(() => {
    const taskId = taskState?.id;
    if (!modalState?.isOpen || modalState.type !== 'task' || !taskId) {
      setAuditEvents([]);
      return;
    }

    let alive = true;
    setIsAuditLoading(true);

    fetch(`/api/audit?taskId=${encodeURIComponent(taskId)}`)
      .then((r) => (r.ok ? r.json() : Promise.resolve(null)))
      .then((data) => {
        if (!alive) return;
        setAuditEvents(Array.isArray(data?.events) ? data.events : []);
      })
      .catch(() => {
        if (!alive) return;
        setAuditEvents([]);
      })
      .finally(() => {
        if (!alive) return;
        setIsAuditLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [modalState?.isOpen, modalState?.type, taskState?.id]);

  useEffect(() => {
    if (!modalState?.isOpen || modalState.type !== 'task') {
      setDbUsers([]);
      return;
    }

    let alive = true;
    setIsUsersLoading(true);

    fetch('/api/users')
      .then((r) => (r.ok ? r.json() : Promise.resolve(null)))
      .then((data) => {
        if (!alive) return;
        setDbUsers(Array.isArray(data?.users) ? data.users : []);
      })
      .catch(() => {
        if (!alive) return;
        setDbUsers([]);
      })
      .finally(() => {
        if (!alive) return;
        setIsUsersLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [modalState?.isOpen, modalState?.type]);

  const addChecklistItem = () => {
    if (!canEdit) return;
    const newItem = { id: `item-${Date.now()}`, text: '', completed: false };
    setTaskState(prev => ({ ...prev, checklists: [...(prev.checklists || []), newItem] }));
  };

  const updateChecklistItem = (id, field, value) => {
    if (!canEdit) return;
    setTaskState(prev => ({
      ...prev,
      checklists: prev.checklists.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const removeChecklistItem = (id) => {
    if (!canEdit) return;
    setTaskState(prev => ({
      ...prev,
      checklists: prev.checklists.filter(item => item.id !== id)
    }));
  };

  const addLabel = (color) => {
    if (!canEdit) return;
    if (taskState.labels?.some(l => l.color === color)) return;
    setTaskState(prev => ({
      ...prev,
      labels: [...(prev.labels || []), { color, text: color.toUpperCase() }]
    }));
  };

  const removeLabel = (color) => {
    if (!canEdit) return;
    setTaskState(prev => ({
      ...prev,
      labels: prev.labels.filter(l => l.color !== color)
    }));
  };

  const calculateProgress = () => {
    if (!taskState.checklists?.length) return 0;
    const completed = taskState.checklists.filter(i => i.completed).length;
    return Math.round((completed / taskState.checklists.length) * 100);
  };

  return (
    <Dialog open={modalState.isOpen} onOpenChange={(open) => !open && setModalState({ ...modalState, isOpen: false })}>
      <DialogContent className={`bg-black border border-zinc-800 text-zinc-100 p-0 gap-0 shadow-2xl rounded-none ${modalState.type === 'task' ? 'sm:max-w-[700px]' : 'sm:max-w-[400px]'}`}>
        <DialogDescription className="sr-only">
          {modalState.type === 'task'
            ? 'Editor de tarefas'
            : modalState.type === 'project'
              ? 'Editor de projeto'
              : modalState.type === 'subProject'
                ? 'Editor de área'
                : modalState.type === 'password'
                  ? 'Solicitação de senha'
                  : 'Diálogo'}
        </DialogDescription>
        <DialogHeader className="p-6 border-b border-zinc-900 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
            {modalState.type === 'task' && <CheckSquare className="h-5 w-5 text-red-600" />}
            {modalState.type === 'project' && (modalState.mode === 'create' ? 'Novo Projeto' : 'Configurar')}
            {modalState.type === 'subProject' && (modalState.mode === 'create' ? 'Nova Área' : 'Editar Área')}
            {modalState.type === 'password' && 'Acesso Restrito'}
            {modalState.type === 'task' && (modalState.mode === 'edit' ? taskState.title || 'Editar' : 'Novo Card')}
          </DialogTitle>
          {modalState.type === 'task' && (
            <div className="flex items-center gap-2 mr-8">
              <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest font-medium">ID: {taskState.id?.slice(-6)}</span>
            </div>
          )}
        </DialogHeader>

        <div className="p-0">
          {modalState.type === 'password' ? (
            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handlePasswordSubmit(new FormData(e.target).get('password')); }}>
                <div className="space-y-4">
                  <Input type="password" name="password" placeholder="SENHA" autoFocus className="bg-zinc-950 border-zinc-800 rounded-none h-12 text-center text-lg tracking-[0.5em] uppercase focus:border-white text-white placeholder:text-zinc-800" />
                  <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 rounded-none h-12 uppercase font-bold tracking-widest text-xs">Entrar</Button>
                </div>
              </form>
            </div>
          ) : modalState.type === 'task' ? (
            <div className="flex flex-col md:flex-row h-[600px]">
              {/* Main Content */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {taskState.labels?.map(label => (
                      <Badge
                        key={label.color}
                        className={cn(
                          'rounded-none px-2 py-1 text-[10px] uppercase tracking-widest font-medium cursor-pointer',
                          BADGE_COLOR_CLASSES[label.color] ?? BADGE_COLOR_CLASSES.zinc
                        )}
                        onClick={() => removeLabel(label.color)}
                      >
                        {label.text} <X className="ml-1 h-2 w-2" />
                      </Badge>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Título do Card</Label>
                    <Input
                      value={taskState.title || ''}
                      disabled={isReadOnly}
                      onChange={(e) => setTaskState(prev => ({ ...prev, title: e.target.value }))}
                      className="bg-transparent border-none p-0 h-auto text-2xl font-black text-white focus-visible:ring-0 rounded-none placeholder:text-zinc-800"
                      placeholder="NOME DA TAREFA..."
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <MessageSquare className="h-4 w-4" />
                    <Label className="text-xs uppercase tracking-widest font-bold">Descrição</Label>
                  </div>
                  <Textarea
                    value={taskState.description || ''}
                    disabled={isReadOnly}
                    onChange={(e) => setTaskState(prev => ({ ...prev, description: e.target.value }))}
                    className="bg-zinc-950 border-zinc-900 rounded-none min-h-[120px] text-sm text-zinc-300 focus:border-zinc-700 p-4 leading-relaxed"
                    placeholder="Adicione uma descrição detalhada (suporta Markdown)..."
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <CheckSquare className="h-4 w-4" />
                      <Label className="text-xs uppercase tracking-widest font-bold">Checklist</Label>
                    </div>
                    {taskState.checklists?.length > 0 && (
                      <span className="text-xs font-mono text-zinc-600 font-medium">{calculateProgress()}%</span>
                    )}
                  </div>

                  {taskState.checklists?.length > 0 && (
                    <div className="space-y-2">
                      <Progress value={calculateProgress()} className="h-1.5 bg-zinc-900" />
                      <div className="space-y-1 mt-4">
                        {taskState.checklists.map(item => (
                          <div key={item.id} className="flex items-center gap-3 group">
                            <Checkbox
                              checked={item.completed}
                              onCheckedChange={(checked) => updateChecklistItem(item.id, 'completed', checked)}
                              className="border-zinc-800 rounded-none"
                            />
                            <Input
                              value={item.text}
                              onChange={(e) => updateChecklistItem(item.id, 'text', e.target.value)}
                              className={`bg-transparent border-none h-8 text-sm focus-visible:ring-0 ${item.completed ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeChecklistItem(item.id)}
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-600 transition-all"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button variant="outline" onClick={addChecklistItem} className="h-8 border-zinc-900 bg-zinc-950/50 text-xs uppercase tracking-widest text-zinc-500 hover:text-white rounded-none w-fit px-4 font-medium">
                    <Plus className="h-3 w-3 mr-2" /> Adicionar Item
                  </Button>
                </div>

                <div className="space-y-4 pt-4 border-t border-zinc-900">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <MessageSquare className="h-4 w-4" />
                    <Label className="text-xs uppercase tracking-widest font-bold">Comentários</Label>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 uppercase font-bold text-zinc-600 text-[10px]">A</div>
                    <div className="flex-1 space-y-2 relative">
                      <Textarea
                        ref={commentInputRef}
                        placeholder="Escreva um comentário (use @ para mencionar)..."
                        value={commentText}
                        disabled={isReadOnly}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCommentText(val);
                          if (val.endsWith('@') || (val.includes('@') && !val.endsWith(' '))) {
                            setShowMentions(true);
                          } else {
                            setShowMentions(false);
                          }
                        }}
                        className="bg-zinc-950 border-zinc-900 rounded-none min-h-[60px] text-sm text-zinc-300 focus:border-zinc-700 p-3"
                        onKeyDown={(e) => {
                          if (isReadOnly) return;
                          
                          if (showMentions && mentionSuggestions.length > 0) {
                            if (e.key === 'Tab' || e.key === 'Enter') {
                              e.preventDefault();
                              insertMention(mentionSuggestions[0]);
                              return;
                            }
                            if (e.key === 'Escape') {
                              setShowMentions(false);
                              return;
                            }
                          }

                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            const val = commentText.trim();
                            if (val) {
                              setTaskState(prev => ({
                                ...prev,
                                comments: [
                                  ...(prev.comments || []),
                                  { user: 'admin', text: val, date: new Date().toISOString() }
                                ]
                              }));
                              setCommentText('');
                              setShowMentions(false);
                            }
                          }
                        }}
                      />

                      {showMentions && mentionSuggestions.length > 0 && (
                        <div className="absolute bottom-full left-0 w-48 glass-panel mb-1 z-50 max-h-32 overflow-y-auto custom-scrollbar">
                          {mentionSuggestions.map(u => (
                            <button
                              key={u.username}
                              onClick={() => insertMention(u)}
                              className="w-full text-left px-3 py-2 text-[10px] uppercase font-bold tracking-widest text-zinc-400 hover:text-white hover:bg-white/10 flex items-center gap-2 border-b border-white/5 last:border-0"
                            >
                              <AtSign className="w-3 h-3 text-red-500" />
                              {u.username}
                            </button>
                          ))}
                        </div>
                      )}

                      <p className="text-[10px] text-zinc-600 font-mono uppercase font-medium">Pressione Enter para enviar</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {taskState.comments?.slice().reverse().map((comment, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="h-6 w-6 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 uppercase font-bold text-zinc-600 text-[10px]">{comment.user?.[0]}</div>
                        <div className="flex-1 bg-zinc-950/50 p-3 border border-zinc-900 rounded-sm space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-white uppercase">{comment.user}</span>
                            <span className="text-[10px] text-zinc-700 font-mono font-medium">{new Date(comment.date).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {renderCommentText(comment.text)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <History className="h-4 w-4" />
                    <Label className="text-xs uppercase tracking-widest font-bold">Atividade</Label>
                  </div>
                  <div className="space-y-3">
                    {isAuditLoading ? (
                      <p className="text-xs text-zinc-700 uppercase font-mono tracking-widest font-medium">Carregando auditoria...</p>
                    ) : auditEvents.length > 0 ? (
                      auditEvents.map((ev) => (
                        <div key={ev.eventId} className="flex gap-3 text-xs">
                          <div className="h-6 w-6 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 uppercase font-bold text-zinc-600">
                            {(ev.userId || '?')[0]}
                          </div>
                          <div className="space-y-1 min-w-0">
                            <p className="text-zinc-400">
                              <span className="font-bold text-white uppercase">{ev.userId}</span> {ev.type}
                            </p>
                            <p className="text-zinc-700 font-mono uppercase font-medium">{new Date(ev.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      ))
                    ) : taskState.activity?.length > 0 ? (
                      taskState.activity.map((act, idx) => (
                        <div key={idx} className="flex gap-3 text-xs">
                          <div className="h-6 w-6 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 uppercase font-bold text-zinc-600">{act.user?.[0]}</div>
                          <div className="space-y-1">
                            <p className="text-zinc-400"><span className="font-bold text-white uppercase">{act.user}</span> {act.action}</p>
                            <p className="text-zinc-700 font-mono uppercase font-medium">{new Date(act.date).toLocaleString()}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-zinc-700 uppercase font-mono tracking-widest font-medium">Nenhuma atividade registrada.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-56 bg-zinc-950/50 p-6 border-l border-zinc-900 space-y-6">
                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-[0.2em] text-zinc-600 font-bold">Ações</Label>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-zinc-500 font-medium">Prioridade</Label>
                      <Select value={taskState.priority || 'medium'} onValueChange={(val) => { if (isReadOnly) return; setTaskState(prev => ({ ...prev, priority: val })); }}>
                        <SelectTrigger className="bg-black border-zinc-900 rounded-none h-8 text-xs uppercase tracking-widest font-medium"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-black border-zinc-800 rounded-none">
                          <SelectItem value="low" className="text-xs uppercase font-medium">Baixa</SelectItem>
                          <SelectItem value="medium" className="text-xs uppercase font-medium">Média</SelectItem>
                          <SelectItem value="high" className="text-xs uppercase text-red-600 font-medium">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-zinc-500 font-medium">Data e Hora de Entrega</Label>
                      <Input
                        type="datetime-local"
                        value={taskState.endDate || ''}
                        disabled={isReadOnly}
                        onChange={(e) => setTaskState(prev => ({ ...prev, endDate: e.target.value }))}
                        className="bg-black border-zinc-900 rounded-none h-8 text-sm uppercase text-zinc-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-[0.2em] text-zinc-600 font-bold">Responsáveis</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                    {isUsersLoading && (
                      <p className="text-xs text-zinc-700 uppercase font-mono tracking-widest font-medium">Carregando usuários...</p>
                    )}
                    {!isUsersLoading && responsibleOptions.map((u) => {
                      const username = u?.username;
                      if (!username) return null;
                      const checked = (taskState.responsibleUsers || []).includes(username);
                      return (
                        <label key={username} className={`flex items-center gap-2 text-xs uppercase tracking-widest font-medium ${isReadOnly ? 'opacity-60' : 'cursor-pointer'}`}>
                          <Checkbox
                            checked={checked}
                            disabled={isReadOnly}
                            onCheckedChange={(nextChecked) => {
                              if (isReadOnly) return;
                              setTaskState((prev) => {
                                const prevList = Array.isArray(prev.responsibleUsers) ? prev.responsibleUsers : [];
                                const nextList = nextChecked
                                  ? Array.from(new Set([...prevList, username]))
                                  : prevList.filter((x) => x !== username);
                                return { ...prev, responsibleUsers: nextList };
                              });
                            }}
                            className="border-zinc-800 rounded-none"
                          />
                          <span className="text-zinc-400">@{username}</span>
                          <span className="text-zinc-600 ml-auto truncate">{u.displayName || username}</span>
                        </label>
                      );
                    })}
                    {!isUsersLoading && responsibleOptions.length === 0 && (
                      <p className="text-xs text-zinc-700 uppercase font-mono tracking-widest font-medium">Nenhum usuário disponível.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-[0.2em] text-zinc-600 font-bold">Etiquetas</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {LABEL_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => {
                          if (isReadOnly) return;
                          taskState.labels?.some(l => l.color === color) ? removeLabel(color) : addLabel(color);
                        }}
                        className={cn('h-4 w-8 rounded-sm transition-all hover:scale-110', LABEL_SWATCH_CLASSES[color] ?? LABEL_SWATCH_CLASSES.zinc, taskState.labels?.some(l => l.color === color) ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : 'opacity-40')}
                      />
                    ))}
                  </div>
                </div>


                <div className="pt-6 border-t border-zinc-900 flex flex-col gap-2">
                  <Button
                    disabled={isReadOnly}
                    className="w-full bg-white text-black hover:bg-zinc-200 rounded-none h-10 uppercase font-black tracking-widest text-xs"
                    onClick={() => {
                      if (isReadOnly) return;
                      const finalTask = {
                        ...taskState,
                        activity: [
                          ...(taskState.activity || []),
                          { user: 'admin', action: 'atualizou o card', date: new Date().toISOString() }
                        ]
                      };
                      handleTaskAction('save', finalTask);
                      setModalState({ ...modalState, isOpen: false });
                    }}
                  >
                    Salvar Tudo
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={isReadOnly}
                    className="w-full text-zinc-600 hover:text-white rounded-none h-10 uppercase tracking-widest text-xs font-medium"
                    onClick={() => {
                      if (isReadOnly) return;
                      handleTaskAction(taskState.isArchived ? 'save' : 'archive', { ...taskState, isArchived: !taskState.isArchived });
                      setModalState({ ...modalState, isOpen: false });
                    }}
                  >
                    <History className="h-3 w-3 mr-2" /> {taskState.isArchived ? 'Desarquivar' : 'Arquivar'}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={isReadOnly}
                    className="w-full text-zinc-600 hover:text-red-600 rounded-none h-10 uppercase tracking-widest text-xs font-medium glitch-hover"
                    onClick={() => {
                      if (isReadOnly) return;
                      if (window.confirm('Excluir este card permanentemente?')) {
                        handleTaskAction('delete', { taskId: taskState.id });
                        setModalState({ ...modalState, isOpen: false });
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3 mr-2" /> Excluir Card
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = Object.fromEntries(new FormData(e.target));
                if (modalState.type === 'project' || modalState.type === 'subProject') handleSaveProject(formData);
              }} className="space-y-4">

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-zinc-500 font-medium">Nome</Label>
                  <Input name="name" disabled={isReadOnly} defaultValue={modalState.data?.name} required className="bg-zinc-950 border-zinc-800 rounded-none h-10 focus:border-white text-white text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-zinc-500 font-medium">Descrição</Label>
                  <Textarea name="description" disabled={isReadOnly} defaultValue={modalState.data?.description} className="bg-zinc-950 border-zinc-800 rounded-none min-h-[80px] text-zinc-300 focus:border-white text-sm" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest text-zinc-500 font-medium">Cor</Label>
                    <Select name="color" defaultValue={modalState.data?.color || "blue"}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 rounded-none h-10"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-black border-zinc-800 rounded-none">
                        {USER_COLORS.map(c => <SelectItem key={c} value={c} className="uppercase text-xs tracking-widest cursor-pointer font-medium">{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end pb-3 gap-3">
                    <Checkbox id="prot" name="isProtected" defaultChecked={modalState.data?.isProtected} className="rounded-none border-zinc-700" />
                    <Label htmlFor="prot" className="text-xs text-zinc-400 cursor-pointer uppercase tracking-widest font-medium">Senha</Label>
                  </div>
                </div>
                {modalState.data?.isProtected && (
                  <Input name="password" type="password" defaultValue={modalState.data?.password} placeholder="Senha do projeto" className="bg-zinc-950 border-zinc-800 rounded-none h-10" />
                )}

                <DialogFooter className="pt-6 border-t border-zinc-900 gap-2">
                  <Button type="button" variant="ghost" onClick={() => setModalState({ ...modalState, isOpen: false })} className="hover:bg-zinc-900 hover:text-white text-zinc-500 rounded-none uppercase text-xs tracking-widest h-10 px-4 font-medium">Cancelar</Button>
                  <Button type="submit" disabled={isReadOnly} className="bg-white text-black hover:bg-zinc-200 rounded-none uppercase text-xs font-bold tracking-widest h-10 px-6">Salvar</Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LegacyModal;
