import { useState, useEffect } from 'react';
import { ListTodo, Kanban, FileText, Goal } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ModuleToggle from '@/components/ui/ModuleToggle';

export function CreateSubProjectModal({ isOpen, onClose, onCreate, mode = 'create', initialData }) {
  // Estado local para os módulos visuais (Grid 2x2)
  const [modules, setModules] = useState({
    todo: true,
    kanban: true,
    files: false,
    goals: false
  });
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Preencher dados quando no modo de edição
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      // Restaurar módulos ativos a partir dos enabledTabs
      const enabledTabs = initialData.enabledTabs || [];
      setModules({
        todo: enabledTabs.includes('todo'),
        kanban: enabledTabs.includes('kanban'),
        files: enabledTabs.includes('files'),
        goals: enabledTabs.includes('goals')
      });
    } else if (mode === 'create') {
      // Reset para criação
      setName('');
      setDescription('');
      setModules({
        todo: true,
        kanban: true,
        files: false,
        goals: false
      });
    }
  }, [mode, initialData, isOpen]);

  const toggleModule = (key) => {
    setModules(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Mapeamento dos dados para a estrutura do sistema
    const subProjectData = {
      name,
      description,
      enabledTabs: Object.keys(modules).filter(k => modules[k]),
    };

    // Se for modo de criação, incluir boardData inicial
    if (mode === 'create') {
      subProjectData.boardData = {
        todo: { lists: [{ id: 'l1', title: 'A FAZER', tasks: [] }, { id: 'l2', title: 'FAZENDO', tasks: [] }, { id: 'l3', title: 'CONCLUÍDO', tasks: [] }] },
        kanban: { lists: [{ id: 'k1', title: 'BACKLOG', tasks: [] }, { id: 'k2', title: 'EM PROGRESSO', tasks: [] }, { id: 'k3', title: 'CONCLUÍDO', tasks: [] }] },
        files: { files: [] }
      };
    }

    onCreate(subProjectData);
    onClose();
  };

  const isEditMode = mode === 'edit';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full glass-panel !fixed p-0 gap-0 text-white overflow-hidden sm:rounded-none border-0">
        <DialogDescription className="sr-only">
          {isEditMode ? 'Edição de área existente' : 'Criação de uma nova área'}
        </DialogDescription>

        {/* HEADER: Minimalista e Tipográfico */}
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <DialogTitle className="text-lg font-black uppercase tracking-tighter text-white">
            {isEditMode ? 'Editar Área' : 'Nova Área'}
          </DialogTitle>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">

          {/* NOME DA ÁREA */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nome da Área</Label>
            <Input
              name="name"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-white focus:ring-1 focus:ring-white/20 focus:border-zinc-600 h-12 rounded-none placeholder:text-zinc-800 transition-all font-medium"
              placeholder=""
            />
          </div>

          {/* DESCRIÇÃO */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Descrição</Label>
            <textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-none p-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600 min-h-[100px] resize-none placeholder:text-zinc-800 transition-all"
              placeholder=""
            />
          </div>

          {/* MÓDULOS ATIVOS (GRID 2x2) */}
          <div className="space-y-3">
            <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Módulos Ativos</Label>
            <div className="grid grid-cols-2 gap-3">
              <ModuleToggle
                active={modules.todo}
                onClick={() => toggleModule('todo')}
                icon={ListTodo}
                label="Lista"
              />
              <ModuleToggle
                active={modules.kanban}
                onClick={() => toggleModule('kanban')}
                icon={Kanban}
                label="Kanban"
              />
              <ModuleToggle
                active={modules.files}
                onClick={() => toggleModule('files')}
                icon={FileText}
                label="Arquivos"
              />
              <ModuleToggle
                active={modules.goals}
                onClick={() => toggleModule('goals')}
                icon={Goal}
                label="Metas"
              />
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-6 flex justify-end gap-4 border-t border-zinc-900 mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-500 hover:text-white h-10 rounded-none hover:bg-transparent px-4"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-white text-black hover:bg-zinc-200 text-[10px] uppercase font-black tracking-[0.2em] h-10 px-8 rounded-none transition-transform active:scale-95"
            >
              {isEditMode ? 'Salvar' : 'Criar'}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
