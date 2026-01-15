import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';

export default function ProjectModal({
    modalState,
    setModalState,
    isReadOnly,
    handleSaveProject,
    USER_COLORS
}) {
    return (
        <DialogContent className="bg-black border border-zinc-800 text-zinc-100 p-0 gap-0 shadow-2xl rounded-none sm:max-w-[400px]">
            <DialogHeader className="p-6 border-b border-zinc-900 flex flex-row items-center justify-between space-y-0">
                <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                    {modalState.type === 'project' && (modalState.mode === 'create' ? 'Novo Projeto' : 'Configurar')}
                    {modalState.type === 'subProject' && (modalState.mode === 'create' ? 'Nova Área' : 'Editar Área')}
                </DialogTitle>
                <DialogDescription className="sr-only">Editor de projeto</DialogDescription>
            </DialogHeader>

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
        </DialogContent>
    );
}
