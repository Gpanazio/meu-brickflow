import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';

export default function PasswordModal({
    handlePasswordSubmit
}) {
    return (
        <DialogContent className="bg-black border border-zinc-800 text-zinc-100 p-0 gap-0 shadow-2xl rounded-none sm:max-w-[400px]">
            <DialogHeader className="p-6 border-b border-zinc-900 flex flex-row items-center justify-between space-y-0">
                <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                    Acesso Restrito
                </DialogTitle>
                <DialogDescription className="sr-only">Solicitação de senha</DialogDescription>
            </DialogHeader>

            <div className="p-6">
                <form onSubmit={(e) => { e.preventDefault(); handlePasswordSubmit(new FormData(e.target).get('password')); }}>
                    <div className="space-y-4">
                        <Input type="password" name="password" placeholder="SENHA" autoFocus className="bg-zinc-950 border-zinc-800 rounded-none h-12 text-center text-lg tracking-[0.5em] uppercase focus:border-white text-white placeholder:text-zinc-800" />
                        <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 rounded-none h-12 uppercase font-bold tracking-widest text-xs">Entrar</Button>
                    </div>
                </form>
            </div>
        </DialogContent>
    );
}
