import React, { useState, useEffect, useCallback } from 'react';
import { Power, X, Edit, Trash2, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COLOR_VARIANTS } from '@/constants/theme';
import { cn } from '@/lib/utils';

export default function TeamManagementModal({ isOpen, onClose, currentUser }) {
  const [manageMode, setManageMode] = useState('list');
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ displayName: '', username: '', email: '', avatar: '', pin: '', role: 'member', color: 'zinc' });
  const [isLoadingUserAction, setIsLoadingUserAction] = useState(false);
  const [userActionMessage, setUserActionMessage] = useState({ type: '', text: '' });
  const [adminUsers, setAdminUsers] = useState([]);
  const [isAdminUsersLoading, setIsAdminUsersLoading] = useState(false);
  const [adminUsersError, setAdminUsersError] = useState(null);

  const canManageTeam = ['gabriel', 'lufe'].includes(String(currentUser?.username || '').toLowerCase()) || currentUser?.role === 'owner';

  const loadAdminUsers = useCallback(async () => {
    setIsAdminUsersLoading(true);
    setAdminUsersError(null);
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao carregar usuários');
      }
      setAdminUsers(data.users || []);
    } catch (err) {
      setAdminUsers([]);
      setAdminUsersError(err.message);
    } finally {
      setIsAdminUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setManageMode('list');
    setEditingUser(null);
    setUserActionMessage({ type: '', text: '' });
    if (canManageTeam) {
      loadAdminUsers();
    }
  }, [isOpen, canManageTeam, loadAdminUsers]);

  const startEdit = (user) => {
    setEditingUser(user);
    setFormData({
      displayName: user.displayName || user.name,
      username: user.username,
      email: user.email || '',
      avatar: user.avatar || '',
      pin: '',
      role: user.role || 'member',
      color: user.color || 'zinc'
    });
    setManageMode('edit');
    setUserActionMessage({ type: '', text: '' });
  };

  const handleUserAction = async (e) => {
    e.preventDefault();
    setIsLoadingUserAction(true);
    setUserActionMessage({ type: '', text: '' });

    try {
      const isEdit = manageMode === 'edit';
      const endpoint = isEdit ? `/api/admin/users/${editingUser.username}` : '/api/admin/users';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = { ...formData };
      if (isEdit && !payload.pin) delete payload.pin;

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Erro na operação');

      setUserActionMessage({ type: 'success', text: data.message || 'Sucesso!' });

      if (!isEdit) {
        setFormData({ displayName: '', username: '', email: '', avatar: '', pin: '', role: 'member', color: 'zinc' });
      }

      await loadAdminUsers();
      setManageMode('list');
      setEditingUser(null);
    } catch (err) {
      setUserActionMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoadingUserAction(false);
    }
  };

  const handleDeleteUser = async (username) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário ${username}?`)) return;

    try {
      const response = await fetch(`/api/admin/users/${username}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Erro ao deletar usuário');

      setUserActionMessage({ type: 'success', text: data.message || 'Usuário deletado.' });
      await loadAdminUsers();
    } catch (err) {
      setUserActionMessage({ type: 'error', text: err.message });
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border border-zinc-800 text-zinc-100 p-0 gap-0 shadow-2xl rounded-none sm:max-w-md">
      <div className="p-6 border-b border-white/10 flex justify-between items-center">
        <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
          <Power className="w-5 h-5 text-green-500" /> Gerenciar Equipe
        </DialogTitle>
        <button onClick={onClose}><X className="w-5 h-5 text-zinc-500 hover:text-white" /></button>
      </div>

      {!canManageTeam ? (
        <div className="p-6">
          <p className="text-xs text-zinc-400">Acesso restrito.</p>
        </div>
      ) : (
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setManageMode('list')}
              className={cn("text-[10px] uppercase font-bold px-2 py-1 rounded transition-colors", manageMode === 'list' ? "bg-white text-black" : "text-zinc-500 hover:text-white")}
            >
              Lista
            </button>
            <button
              onClick={() => { setManageMode('create'); setEditingUser(null); setFormData({ displayName: '', username: '', email: '', avatar: '', pin: '', role: 'member', color: 'zinc' }); }}
              className={cn("text-[10px] uppercase font-bold px-2 py-1 rounded transition-colors", manageMode === 'create' ? "bg-white text-black" : "text-zinc-500 hover:text-white")}
            >
              Novo
            </button>
          </div>

          {manageMode === 'list' && (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
              {isAdminUsersLoading && (
                <p className="text-[10px] text-zinc-500 font-mono">Carregando usuários...</p>
              )}
              {!isAdminUsersLoading && adminUsersError && (
                <p className="text-[10px] text-red-500 font-mono">{adminUsersError}</p>
              )}
              {!isAdminUsersLoading && !adminUsersError && adminUsers.length === 0 && (
                <p className="text-[10px] text-zinc-600 font-mono">Nenhum usuário encontrado.</p>
              )}

              {!isAdminUsersLoading && !adminUsersError && adminUsers.map(u => {
                const colorVariant = COLOR_VARIANTS[u.color] || COLOR_VARIANTS.zinc;
                const display = u.displayName || u.name || u.username;
                return (
                  <div key={u.username} className="flex items-center justify-between bg-black/40 border border-zinc-900 p-2 rounded">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border",
                        colorVariant.bg,
                        colorVariant.border,
                        "text-white"
                      )}>
                        {display.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-200">{display}</p>
                        <p className="text-[10px] text-zinc-600 font-mono">@{u.username} • {u.role === 'owner' ? 'ADMIN' : 'MEMBRO'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white" onClick={() => startEdit(u)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      {u.username !== currentUser.username && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-red-500" onClick={() => handleDeleteUser(u.username)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {(manageMode === 'create' || manageMode === 'edit') && (
            <form onSubmit={handleUserAction} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Nome</label>
                  <Input value={formData.displayName} onChange={e => setFormData({ ...formData, displayName: e.target.value })} required className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Usuário (ID)</label>
                  <Input value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required className="h-8 text-xs" disabled={manageMode === 'edit'} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Email</label>
                  <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="h-8 text-xs" placeholder="nome@empresa.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Avatar (URL)</label>
                  <Input value={formData.avatar} onChange={e => setFormData({ ...formData, avatar: e.target.value })} className="h-8 text-xs" placeholder="https://..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">{manageMode === 'edit' ? 'Nova Senha (Opcional)' : 'Senha'}</label>
                  <Input type="password" value={formData.pin} onChange={e => setFormData({ ...formData, pin: e.target.value })} required={manageMode === 'create'} className="h-8 text-xs" autoComplete="new-password" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Permissão</label>
                  <div className="relative">
                    <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="flex h-8 w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-700 text-white appearance-none">
                      <option value="member">Membro</option>
                      <option value="owner">Admin (Owner)</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2 h-4 w-4 opacity-50 text-white pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Cor do Avatar</label>
                <div className="flex gap-2">
                  {['blue', 'red', 'green', 'purple', 'orange', 'zinc'].map(c => {
                    const colorVariant = COLOR_VARIANTS[c] || COLOR_VARIANTS.zinc;
                    return (
                      <div
                        key={c}
                        onClick={() => setFormData({ ...formData, color: c })}
                        className={cn(
                          "w-6 h-6 rounded-full cursor-pointer border-2 transition-all",
                          formData.color === c ? "border-white scale-110" : "border-transparent opacity-50 hover:opacity-100",
                          colorVariant.bg
                        )}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                {manageMode === 'edit' && (
                  <Button type="button" variant="ghost" className="flex-1 h-8 text-xs font-bold uppercase" onClick={() => setManageMode('list')}>Cancelar</Button>
                )}
                <Button type="submit" disabled={isLoadingUserAction} className="flex-1 bg-white text-zinc-950 font-bold uppercase tracking-widest h-8 text-xs">
                  {isLoadingUserAction ? 'Salvando...' : (manageMode === 'create' ? 'Criar Usuário' : 'Atualizar Usuário')}
                </Button>
              </div>

              {userActionMessage.text && (
                <p className={cn("text-[10px] font-mono text-center", userActionMessage.type === 'success' ? "text-green-500" : "text-red-500")}>
                  {userActionMessage.text}
                </p>
              )}
            </form>
          )}
        </div>
      )}
      </DialogContent>
    </Dialog>
  );
}
