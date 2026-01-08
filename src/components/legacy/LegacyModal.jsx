import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

function LegacyModal({
  modalState,
  setModalState,
  handlePasswordSubmit,
  handleSaveProject,
  handleTaskAction,
  USER_COLORS
}) {
  return (
    <Dialog open={modalState.isOpen} onOpenChange={(open) => !open && setModalState({ ...modalState, isOpen: false })}>
      <DialogContent className="sm:max-w-[400px] bg-black border border-zinc-800 text-zinc-100 p-0 gap-0 shadow-2xl rounded-none">
        <DialogHeader className="p-6 border-b border-zinc-900">
          <DialogTitle className="text-lg font-black uppercase tracking-tight">
            {modalState.type === 'project' && (modalState.mode === 'create' ? 'Novo Projeto' : 'Configurar')}
            {modalState.type === 'subProject' && (modalState.mode === 'create' ? 'Nova Área' : 'Editar Área')}
            {modalState.type === 'password' && 'Acesso Restrito'}
            {modalState.type === 'task' && (modalState.mode === 'edit' ? 'Editar' : 'Novo Item')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6">
          {modalState.type === 'password' ? (
            <form onSubmit={(e) => { e.preventDefault(); handlePasswordSubmit(new FormData(e.target).get('password')); }}>
              <div className="space-y-4">
                <Input type="password" name="password" placeholder="SENHA" autoFocus className="bg-zinc-950 border-zinc-800 rounded-none h-12 text-center text-lg tracking-[0.5em] uppercase focus:border-white text-white placeholder:text-zinc-800" />
                <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 rounded-none h-12 uppercase font-bold tracking-widest text-xs">Entrar</Button>
              </div>
            </form>
          ) : (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = Object.fromEntries(new FormData(e.target));
              if (modalState.type === 'project' || modalState.type === 'subProject') handleSaveProject(formData);
              if (modalState.type === 'task') handleTaskAction('save', formData);
            }} className="space-y-4">
              
              {(modalState.type === 'project' || modalState.type === 'subProject') && (
                <>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Nome</Label>
                    <Input name="name" defaultValue={modalState.data?.name} required className="bg-zinc-950 border-zinc-800 rounded-none h-10 focus:border-white text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Descrição</Label>
                    <Textarea name="description" defaultValue={modalState.data?.description} className="bg-zinc-950 border-zinc-800 rounded-none min-h-[80px] text-zinc-300 focus:border-white" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Cor</Label>
                      <Select name="color" defaultValue={modalState.data?.color || "blue"}>
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 rounded-none h-10"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-black border-zinc-800 rounded-none">
                          {USER_COLORS.map(c => <SelectItem key={c} value={c} className="uppercase text-[10px] tracking-widest cursor-pointer">{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end pb-3 gap-3">
                      <Checkbox id="prot" name="isProtected" defaultChecked={modalState.data?.isProtected} className="rounded-none border-zinc-700" />
                      <Label htmlFor="prot" className="text-[10px] text-zinc-400 cursor-pointer uppercase tracking-widest">Senha</Label>
                    </div>
                  </div>
                  {modalState.data?.isProtected && (
                     <Input name="password" type="password" defaultValue={modalState.data?.password} placeholder="Senha do projeto" className="bg-zinc-950 border-zinc-800 rounded-none h-10" />
                  )}
                </>
              )}

              {modalState.type === 'task' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Título</Label>
                    <Input name="title" defaultValue={modalState.data?.title} required className="bg-zinc-950 border-zinc-800 rounded-none h-12 text-base font-bold text-white focus:border-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Prioridade</Label>
                        <Select name="priority" defaultValue={modalState.data?.priority || 'medium'}>
                            <SelectTrigger className="bg-zinc-950 border-zinc-800 rounded-none h-10 text-xs uppercase"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-black border-zinc-800 rounded-none">
                                <SelectItem value="low" className="text-[10px]">Baixa</SelectItem>
                                <SelectItem value="medium" className="text-[10px]">Média</SelectItem>
                                <SelectItem value="high" className="text-[10px] text-red-500">Alta</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Data</Label>
                        <Input type="date" name="endDate" defaultValue={modalState.data?.endDate} className="bg-zinc-950 border-zinc-800 rounded-none h-10 text-xs uppercase text-zinc-300" />
                    </div>
                  </div>
                </>
              )}

              <DialogFooter className="pt-6 border-t border-zinc-900 gap-2">
                <Button type="button" variant="ghost" onClick={() => setModalState({ ...modalState, isOpen: false })} className="hover:bg-zinc-900 hover:text-white text-zinc-500 rounded-none uppercase text-[10px] tracking-widest h-10 px-4">Cancelar</Button>
                <Button type="submit" className="bg-white text-black hover:bg-zinc-200 rounded-none uppercase text-[10px] font-bold tracking-widest h-10 px-6">Salvar</Button>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LegacyModal;
