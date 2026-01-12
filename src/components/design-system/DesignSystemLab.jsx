import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Plus, 
  ArrowRight, 
  Activity, 
  Cpu, 
  Box 
} from 'lucide-react';
import PrismaticPanel from '@/components/ui/PrismaticPanel';

// --- UTILITÁRIOS VISUAIS ---

const useScramble = (text, speed = 40) => {
  const [display, setDisplay] = useState(text);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';

  useEffect(() => {
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplay(
        text
          .split('')
          .map((letter, index) => {
            if (index < iteration) return text[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('')
      );

      if (iteration >= text.length) clearInterval(interval);
      iteration += 1 / 3;
    }, speed);
    
    return () => clearInterval(interval);
  }, [text, speed]);

  return display;
};

const MonoData = ({ children, className }) => {
  const scrambled = useScramble(children || '');
  return (
    <span className={`font-mono tracking-widest text-xs ${className}`}>
      {scrambled}
    </span>
  );
};

// 3. Card de Projeto "Monolítico" (Exemplo)
const ProjectMonolith = ({ title, description, color, isProtected }) => {
  const colors = {
    red: 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]',
    blue: 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]',
    zinc: 'bg-zinc-600 shadow-[0_0_15px_rgba(82,82,91,0.5)]',
  };

  return (
    <PrismaticPanel hoverEffect className="h-64 p-8 flex flex-col justify-between">
      <div className="flex justify-between items-start z-10">
        <div className={`w-1.5 h-1.5 rounded-full ${colors[color] || colors.zinc} animate-pulse`} />
        
        {isProtected && (
          <div className="flex items-center gap-2 text-zinc-600">
            <MonoData className="text-[9px]">LOCKED</MonoData>
            <Lock className="w-3 h-3" />
          </div>
        )}
      </div>

      <div className="space-y-4 z-10 relative">
        <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-[0.85] group-hover:translate-x-1 transition-transform duration-300">
          {title}
        </h3>
        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest line-clamp-2 leading-relaxed max-w-[90%]">
          {description}
        </p>
      </div>

      <div className="flex justify-end items-end border-t border-white/5 pt-4 z-10">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
          <span className="text-[9px] font-bold uppercase text-white tracking-widest">Acessar</span>
          <ArrowRight className="w-3 h-3 text-white" />
        </div>
      </div>
    </PrismaticPanel>
  );
};

// 4. Botão "Mecânico"
const MechButton = ({ children, primary = false, icon: Icon }) => (
  <button 
    className={`
      relative overflow-hidden group
      h-10 px-6 flex items-center gap-3
      uppercase text-[10px] font-black tracking-[0.2em]
      transition-all duration-150 active:scale-95
      ${primary 
        ? 'bg-white text-black hover:bg-zinc-200' 
        : 'bg-transparent text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-600 hover:bg-white/5'}
    `}
  >
    {Icon && <Icon className="w-3 h-3" />}
    <span className="relative z-10">{children}</span>
    
    {primary && <div className="absolute inset-0 bg-white mix-blend-overlay opacity-0 group-hover:opacity-20 transition-opacity" />}
  </button>
);

// --- TELA PRINCIPAL DA SIMULAÇÃO ---

export default function DesignSystemLab() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-500/30 overflow-hidden relative">
      
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div 
          className="absolute inset-0 opacity-[0.15]" 
          style={{ 
            backgroundImage: `linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(circle at center, black, transparent 80%)'
          }} 
        />
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/50 to-black" />
      </div>

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none select-none">
        <h1 
          className="text-[15vw] font-black text-transparent leading-none text-center opacity-5 whitespace-nowrap"
          style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)' }}
        >
          BRICKFLOW
        </h1>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-8 md:p-12 space-y-12">
        
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-white flex items-center justify-center">
              <Box className="w-4 h-4 text-black" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tight leading-none">BRICKFLOW OS</span>
              <MonoData className="text-[8px] text-zinc-600 mt-1">V.2.0.ALPHA</MonoData>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-zinc-600">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <MonoData className="text-[9px]">SYSTEM ONLINE</MonoData>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-6 max-w-2xl">
          <MonoData className="text-red-500 text-xs font-bold">/// DASHBOARD_VIEW</MonoData>
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9]">
            Construa o<br />
            <span className="text-zinc-600">Impossível.</span>
          </h2>
          <div className="flex gap-4 mt-4">
            <MechButton primary icon={Plus}>Novo Projeto</MechButton>
            <MechButton icon={Cpu}>Logs do Sistema</MechButton>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-12">
          
          <ProjectMonolith 
            title="Brick ADM" 
            description="Gestão administrativa interna e controle financeiro."
            color="red"
            isProtected={true}
          />

          <ProjectMonolith 
            title="Originais Brick" 
            description="Desenvolvimento de produtos proprietários e P&D."
            color="blue"
            isProtected={false}
          />

          <PrismaticPanel hoverEffect className="h-64 flex flex-col items-center justify-center gap-4 border-dashed border-zinc-800 hover:border-zinc-600 group">
             <div className="w-12 h-12 border border-zinc-800 bg-black/50 flex items-center justify-center group-hover:border-white transition-colors duration-300">
               <Plus className="w-5 h-5 text-zinc-500 group-hover:text-white" />
             </div>
             <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400">Iniciar Nova Matriz</span>
          </PrismaticPanel>

        </div>

        <div className="pt-12 border-t border-zinc-900">
           <div className="mb-6 flex items-center gap-3">
             <Activity className="w-4 h-4 text-zinc-600" />
             <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Visualização Tática</h3>
           </div>

           <div className="flex gap-1 h-64 overflow-hidden">
             <div className="w-64 bg-zinc-950/30 border-r border-l border-zinc-900/50 p-4 flex flex-col gap-3">
               <div className="flex justify-between items-center pb-2 border-b border-zinc-900/50">
                 <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Backlog</span>
                 <MonoData className="text-[9px] text-zinc-700">03</MonoData>
               </div>
               <div className="bg-black border border-zinc-800 p-3 hover:border-zinc-600 transition-colors cursor-pointer group">
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] font-bold text-zinc-300 uppercase">Refatorar UI</span>
                    <div className="w-1 h-1 bg-red-600" />
                  </div>
                  <MonoData className="text-[8px] text-zinc-600">TASK-992</MonoData>
               </div>
             </div>

             <div className="w-1 bg-transparent" />

             <div className="w-64 bg-zinc-950/30 border-r border-l border-zinc-900/50 p-4 flex flex-col gap-3">
               <div className="flex justify-between items-center pb-2 border-b border-zinc-900/50">
                 <span className="text-[10px] font-black uppercase tracking-widest text-white">Em Progresso</span>
                 <MonoData className="text-[9px] text-zinc-700">01</MonoData>
               </div>
               <div className="bg-zinc-900/40 border border-zinc-700 p-3 cursor-pointer relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-0.5 h-full bg-blue-600" />
                  <div className="flex justify-between mb-2 pl-2">
                    <span className="text-[10px] font-bold text-white uppercase">Integração API</span>
                  </div>
                  <MonoData className="text-[8px] text-zinc-500 pl-2">TASK-104</MonoData>
               </div>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}
