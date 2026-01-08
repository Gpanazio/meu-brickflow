import React, { useState } from 'react';
import { 
  X, ListTodo, KanbanSquare, FileText, Goal, Lock, ChevronDown 
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function CreateProjectModal({ isOpen, onClose, onCreate }) {
  // Estado local para controlar a UI rica do modal
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
    
    // Constrói o objeto de dados complexo esperado pelo App
    const projectData = {
      name: formData.get('name'),
      description: formData.get('description'),
      color: selectedColor,
      isProtected: isProtected,
      password: formData.get('password'),
      // Mapeia os módulos visuais para o formato de tabs do sistema
      enabledTabs: Object.keys(modules).filter(k => modules[k]),
      // Dados iniciais para cada módulo ativado
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
      <DialogContent className="max-w-md bg-black border border-zinc-800 p-0 gap-0 text-white shadow-2xl overflow-hidden">
        {/* Header Estilizado */}
        <div className="flex justify-between items-center p-6 border-b border-zinc-900">
          <h2 className="text-xl font-black uppercase tracking-tight text-white">Novo Projeto</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Nome do Projeto */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nome do Projeto</Label>
            <Input 
              name="name" 
              required 
              autoFocus
              className="bg-zinc-950 border-zinc-800 text-white focus:ring-1 focus:ring-zinc-700 h-11 rounded-md" 
              placeholder="" 
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Descrição</Label>
            <textarea 
              name="description" 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-700 min-h-[80px] resize-none"
            />
          </div>

          {/* Seletor de Módulos (Grid Visual) */}
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
                icon={KanbanSquare} 
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

          {/* Cor e Segurança */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cor</Label>
              <div className="relative">
                <select 
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-full h-11 bg-zinc-950 border border-zinc-800 rounded-md text-white px-3 text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-zinc-700 uppercase font-medium"
                >
                  <option value="blue">Blue</option>
                  <option value="red">Red</option>
                  <option value="green">Green</option>
                  <option value="purple">Purple</option>
                  <option value="orange">Orange</option>
                </select>
                <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-zinc-500 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-end">
               <div 
                 onClick={() => setIsProtected(!isProtected)}
                 className={cn(
                   "w-full h-11 border rounded-md flex items-center px-3 gap-3 cursor-pointer transition-all",
                   isProtected 
                     ? "bg-zinc-900 border-zinc-700" 
                     : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                 )}
               >
                 <div className={cn("w-4 h-4 rounded-sm border flex items-center justify-center transition-colors", isProtected ? "bg-white border-white" : "border-zinc-600")}>
                    {isProtected && <div className="w-2 h-2 bg-black rounded-[1px]" />}
                 </div>
                 <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300 leading-tight">Proteger com<br/>Senha</span>
               </div>
            </div>
          </div>

          {/* Campo de Senha Condicional */}
          {isProtected && (
            <div className="space-y-2 animate-in slide-in-from-top-2 fade-in">
               <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Senha (Opcional)</Label>
               <Input 
                 name="password" 
                 type="password" 
                 placeholder="••••••" 
                 className="bg-zinc-950 border-zinc-800 h-11 text-white tracking-widest" 
               />
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 hover:text-white h-10">Cancelar</Button>
            <Button type="submit" className="bg-white text-black hover:bg-zinc-200 text-[10px] uppercase font-bold tracking-widest h-10 px-8 rounded-md">Salvar</Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}

// Subcomponente para os botões de módulo (Grid)
function ModuleToggle({ active, onClick, icon: Icon, label }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "cursor-pointer border rounded-md p-3 flex items-center gap-3 transition-all duration-200 group",
        active 
          ? "bg-zinc-900 border-zinc-600" 
          : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
      )}
    >
      <div className={cn(
        "w-5 h-5 rounded-sm border flex items-center justify-center transition-colors",
        active ? "bg-white border-white text-black" : "bg-transparent border-zinc-700 text-transparent"
      )}>
        {active && <div className="w-2.5 h-2.5 bg-black rounded-[1px]" />}
      </div>
      <div className="flex items-center gap-2">
         <Icon className={cn("w-4 h-4", active ? "text-white" : "text-zinc-600 group-hover:text-zinc-500")} />
         <span className={cn("text-[10px] font-bold uppercase tracking-widest", active ? "text-white" : "text-zinc-600 group-hover:text-zinc-500")}>{label}</span>
      </div>
    </div>
  );
}
