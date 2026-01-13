import { useState } from 'react';
import {
  ListTodo, Kanban, FileText, Goal, ChevronDown
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function CreateProjectModal({ isOpen, onClose, onCreate }) {
  // Estado local para os módulos visuais (Grid 2x2)
  const [modules, setModules] = useState({
    todo: true,
    kanban: true,
    files: false,
    goals: false
  });
  
  const [isProtected, setIsProtected] = useState(false);
  const [selectedColor, setSelectedColor] = useState('blue');

  const toggleModule = (key) => {
    setModules(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
      enabledTabs: Object.keys(modules).filter(k => modules[k]),
      boardData: {
        todo: { lists: [{ id: 'l1', title: 'A FAZER', tasks: [] }, { id: 'l2', title: 'FAZENDO', tasks: [] }, { id: 'l3', title: 'CONCLUÍDO', tasks: [] }] }, 
        kanban: { lists: [{ id: 'k1', title: 'BACKLOG', tasks: [] }, { id: 'k2', title: 'EM PROGRESSO', tasks: [] }, { id: 'k3', title: 'CONCLUÍDO', tasks: [] }] }, 
        files: { files: [] }
      }
    };

    onCreate(projectData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full glass-panel p-0 gap-0 text-white overflow-hidden sm:rounded-none border-0">
        <DialogDescription className="sr-only">Criação de um novo projeto</DialogDescription>
        
        {/* HEADER: Minimalista e Tipográfico */}
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <h2 className="text-lg font-black uppercase tracking-tighter text-white">Novo Projeto</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          
          {/* NOME DO PROJETO */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nome do Projeto</Label>
            <Input 
              name="name" 
              required 
              autoFocus
              className="bg-zinc-950 border border-zinc-800 text-white focus:ring-1 focus:ring-white/20 focus:border-zinc-600 h-12 rounded-none placeholder:text-zinc-800 transition-all font-medium text-sm" 
              placeholder="" 
            />
          </div>

          {/* DESCRIÇÃO */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Descrição</Label>
            <textarea 
              name="description" 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-none p-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600 min-h-[100px] resize-none placeholder:text-zinc-800 transition-all"
              placeholder=""
            />
          </div>

          {/* MÓDULOS ATIVOS (GRID 2x2) */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Módulos Ativos</Label>
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

          {/* GRID DE OPÇÕES INFERIORES */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* COR */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Cor</Label>
              <div className="relative">
                <select 
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-full h-12 bg-zinc-950 border border-zinc-800 rounded-none text-white px-3 text-xs appearance-none focus:outline-none focus:border-zinc-600 uppercase font-bold tracking-widest cursor-pointer transition-colors"
                >
                  <option value="blue">Blue</option>
                  <option value="red">Red</option>
                  <option value="green">Green</option>
                  <option value="purple">Purple</option>
                  <option value="orange">Orange</option>
                </select>
                <ChevronDown className="absolute right-3 top-4 h-4 w-4 text-zinc-600 pointer-events-none" />
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
                 <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 leading-tight">Proteger com<br/>Senha</span>
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

// Subcomponente de Toggle Visual (Card)
function ModuleToggle({ active, onClick, icon: Icon, label }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "cursor-pointer h-12 flex items-center px-4 gap-3 transition-all duration-200 group border rounded-none select-none",
        active 
          ? "bg-zinc-950 border-zinc-600" 
          : "bg-black border-zinc-800 hover:border-zinc-700"
      )}
    >
      <div className={cn(
        "w-4 h-4 rounded-sm border flex items-center justify-center transition-colors shrink-0",
        active ? "bg-white border-white" : "bg-black border-zinc-700 group-hover:border-zinc-500"
      )}>
        {active && <div className="w-2 h-2 bg-black rounded-[1px]" />}
      </div>
      <div className="flex items-center gap-3">
         <Icon className={cn("w-3 h-3", active ? "text-white" : "text-zinc-600 group-hover:text-zinc-400")} />
         <span className={cn("text-[10px] font-bold uppercase tracking-widest pt-0.5", active ? "text-white" : "text-zinc-600 group-hover:text-zinc-400")}>{label}</span>
      </div>
    </div>
  );
}
