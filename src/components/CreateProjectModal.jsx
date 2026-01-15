
import { useState } from 'react';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { USER_COLORS, COLOR_VARIANTS, LABEL_SWATCH_CLASSES } from '@/constants/theme';

export default function CreateProjectModal({ isOpen, onClose, onCreate, mode = 'create', initialData = null }) {
  const [isProtected, setIsProtected] = useState(initialData?.isProtected || false);
  const [selectedColor, setSelectedColor] = useState(initialData?.color || 'blue');

  // Reset states when initialData changes (e.g. switching between create/edit or different projects)
  useState(() => {
    if (initialData) {
      setIsProtected(initialData.isProtected || false);
      setSelectedColor(initialData.color || 'blue');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    // Mapeamento dos dados para a estrutura do sistema
    const projectData = {
      name: formData.get('name'),
      description: formData.get('description'),
      color: selectedColor,
      isProtected: isProtected,
      password: formData.get('password'),
      enabledTabs: [], // Projetos pai não têm módulos diretos, apenas as áreas (subprojetos)
      boardData: {
        todo: { lists: [] },
        kanban: { lists: [] },
        files: { files: [] }
      }
    };

    onCreate(projectData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full glass-panel !fixed p-0 gap-0 text-white overflow-hidden sm:rounded-none border-0">
        <DialogDescription className="sr-only">Criação de um novo projeto</DialogDescription>

        {/* HEADER: Minimalista e Tipográfico */}
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <DialogTitle className="text-lg font-black uppercase tracking-tighter text-white">
            {mode === 'edit' ? 'Editar Projeto' : 'Novo Projeto'}
          </DialogTitle>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">

          {/* NOME DO PROJETO */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nome do Projeto</Label>
            <Input
              name="name"
              required
              autoFocus
              defaultValue={initialData?.name}
              className="bg-zinc-950 border border-zinc-800 text-white focus:ring-1 focus:ring-white/20 focus:border-zinc-600 h-12 rounded-none placeholder:text-zinc-800 transition-all font-medium text-sm"
              placeholder=""
            />
          </div>

          {/* DESCRIÇÃO */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Descrição</Label>
            <textarea
              name="description"
              defaultValue={initialData?.description}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-none p-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600 min-h-[100px] resize-none placeholder:text-zinc-800 transition-all"
              placeholder=""
            />
          </div>

          {/* GRID DE OPÇÕES INFERIORES */}
          <div className="grid grid-cols-2 gap-4">

            {/* COR */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Cor</Label>
              <div className="grid grid-cols-6 gap-1.5">
                {USER_COLORS.map((color) => {
                  const isSelected = selectedColor === color;
                  const variant = COLOR_VARIANTS[color] || COLOR_VARIANTS.blue;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "relative h-10 w-full rounded-sm transition-all duration-200",
                        LABEL_SWATCH_CLASSES[color],
                        isSelected
                          ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-105 shadow-lg"
                          : "opacity-60 hover:opacity-100 hover:scale-105",
                        variant.hover
                      )}
                    >
                      {isSelected && (
                        <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-md" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TOGGLE PROTEÇÃO */}
            <div className="flex items-end">
              <div
                onClick={() => setIsProtected(!isProtected)}
                className={cn(
                  "w-full h-12 border rounded-none flex items-center px-4 gap-3 cursor-pointer transition-all select-none",
                  isProtected
                    ? "bg-zinc-900 border-zinc-700"
                    : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                )}
              >
                <div className={cn("w-4 h-4 rounded-sm border flex items-center justify-center transition-colors", isProtected ? "bg-white border-white" : "border-zinc-700 bg-black")}>
                  {isProtected && <div className="w-2 h-2 bg-black rounded-[1px]" />}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 leading-tight">Proteger com<br />Senha</span>
              </div>
            </div>
          </div>

          {/* SENHA (CONDICIONAL) */}
          {isProtected && (
            <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Senha (Opcional)</Label>
              <Input
                name="password"
                type="password"
                defaultValue={initialData?.password}
                placeholder="••••••"
                className="bg-zinc-950 border border-zinc-800 h-12 text-white tracking-[0.5em] text-center rounded-none focus:border-white transition-colors text-sm"
              />
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="pt-6 flex justify-end gap-4 border-t border-zinc-900 mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-xs uppercase font-bold tracking-[0.2em] text-zinc-500 hover:text-white h-10 rounded-none hover:bg-transparent px-4"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-white text-black hover:bg-zinc-200 text-xs uppercase font-black tracking-[0.2em] h-10 px-8 rounded-none transition-transform active:scale-95"
            >
              Salvar
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
