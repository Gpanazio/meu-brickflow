import React, { useState, useEffect, useRef } from 'react';
import { Settings, X, Upload, Sparkles, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/utils/formatFileSize';
import { formatBackupTimestamp } from '@/utils/dates';
import { NO_SENSE_AVATARS } from '@/constants/avatars';

export default function UserSettingsModal({
  isOpen,
  onClose,
  currentUser,
  backups,
  isBackupsLoading,
  backupError,
  isBackupRestoring,
  onRefreshBackups,
  onRestoreBackup,
  onExportBackup
}) {
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatar);
  const fileInputRef = useRef(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setAvatarPreview(currentUser?.avatar);
    }
  }, [isOpen, currentUser]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setAvatarPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSavingProfile(true);
    setProfileSaveError(null);

    try {
      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: avatarPreview })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar avatar');
      }

      onClose();
      window.location.reload();
    } catch (err) {
      setProfileSaveError(err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border border-zinc-800 text-zinc-100 p-0 gap-0 shadow-2xl rounded-none sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-zinc-500" /> Configurações
          </DialogTitle>
          <DialogDescription className="sr-only">
            Ajuste seu perfil, avatares e gerencie backups.
          </DialogDescription>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="space-y-8">
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Avatar do Usuário</h3>
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20 border-2 border-zinc-800">
                  <AvatarImage src={avatarPreview} className="object-cover" />
                  <AvatarFallback className="bg-zinc-900 text-zinc-500 text-2xl font-bold">
                    {(currentUser?.name || currentUser?.username || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-8 text-xs uppercase font-bold tracking-widest"><Upload className="w-3 h-3 mr-2" /> Upload</Button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                  <p className="text-[10px] text-zinc-600 font-mono">JPG, PNG ou GIF.</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Sparkles className="w-3 h-3 text-purple-500" /> Avatares Gerados</h3>
              <div className="grid grid-cols-6 gap-2">
                {NO_SENSE_AVATARS.map((url, idx) => (
                  <div key={idx} onClick={() => setAvatarPreview(url)} className={cn("aspect-square rounded-full overflow-hidden cursor-pointer border-2 transition-all hover:scale-105", avatarPreview === url ? "border-red-600 opacity-100" : "border-zinc-800 opacity-60 hover:opacity-100 hover:border-zinc-600")}>
                    <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Save className="w-3 h-3 text-red-500" /> Backups na Nuvem</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={onRefreshBackups} className="h-8 text-xs uppercase font-bold tracking-widest" disabled={isBackupsLoading}>{isBackupsLoading ? 'Atualizando...' : 'Atualizar'}</Button>
                <Button variant="outline" onClick={() => onExportBackup()} className="h-8 text-xs uppercase font-bold tracking-widest" disabled={!backups?.length}>Exportar Último</Button>
              </div>
              {backupError && <p className="mt-3 text-[10px] text-red-500 font-mono">Erro ao carregar backups.</p>}
              <div className="mt-4 space-y-3">
                {!isBackupsLoading && backups?.map((backup) => (
                  <div key={backup.id} className="border border-zinc-900 rounded-md p-3 flex flex-col gap-2 bg-zinc-950/40">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-200">Snapshot #{backup.id}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">{formatBackupTimestamp(backup.created_at)} • {backup.kind}</p>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">{(backup.snapshot && formatFileSize(JSON.stringify(backup.snapshot).length)) || 'N/A'}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" className="h-7 text-[10px] uppercase font-bold tracking-widest" onClick={() => onExportBackup(backup.id)}>Exportar</Button>
                      <Button
                        variant="destructive"
                        className="h-7 text-[10px] uppercase font-bold tracking-widest"
                        disabled={isBackupRestoring}
                        onClick={() => {
                          if (window.confirm('Restaurar este snapshot?')) {
                            onRestoreBackup(backup.id);
                          }
                        }}
                      >
                        Restaurar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-zinc-900 bg-zinc-950 flex flex-col gap-2 shrink-0">
          {profileSaveError && <p className="text-[10px] text-red-500 font-mono text-center">{profileSaveError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} className="text-xs font-bold uppercase">Cancelar</Button>
            <Button onClick={handleSave} disabled={isSavingProfile} className="bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold uppercase">{isSavingProfile ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
