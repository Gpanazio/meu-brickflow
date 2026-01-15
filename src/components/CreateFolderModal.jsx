import { useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { FOLDER_COLORS } from '../hooks/useFiles';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from './ui/dialog';
import { Input } from './ui/input';
import MechButton from './ui/MechButton';

export default function CreateFolderModal({ isOpen, onClose, onCreate }) {
    const [name, setName] = useState('');
    const [color, setColor] = useState('default');

    const handleCreate = () => {
        if (!name.trim()) return;
        onCreate(name.trim(), color);
        setName('');
        setColor('default');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="glass-panel border-zinc-800 rounded-none bg-black/95 max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-white uppercase tracking-tighter font-black flex items-center gap-2">
                        <FolderPlus className="w-5 h-5" />
                        Nova Pasta
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
                        Crie uma pasta para organizar seus arquivos
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {/* Name Input */}
                    <div>
                        <label className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2 block">
                            Nome da Pasta
                        </label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Referências, Entregas..."
                            className="bg-black/50 border-zinc-800 rounded-none font-mono text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreate();
                            }}
                        />
                    </div>

                    {/* Color Selector */}
                    <div>
                        <label className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2 block">
                            Cor
                        </label>
                        <div className="flex gap-2">
                            {FOLDER_COLORS.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setColor(c.id)}
                                    className={`
                    w-10 h-10 ${c.bg} ${c.border} border-2 transition-all cursor-pointer
                    ${color === c.id ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}
                  `}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4">
                        <MechButton onClick={onClose} className="flex-1">
                            Cancelar
                        </MechButton>
                        <MechButton
                            primary
                            onClick={handleCreate}
                            className="flex-1"
                            disabled={!name.trim()}
                            icon={FolderPlus}
                        >
                            Criar
                        </MechButton>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
