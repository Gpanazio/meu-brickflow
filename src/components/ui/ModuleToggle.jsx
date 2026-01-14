import React from 'react';
import { cn } from '@/lib/utils';

export default function ModuleToggle({ active, onClick, icon: Icon, label }) {
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
      <div className={cn("w-4 h-4 rounded-sm border flex items-center justify-center transition-colors shrink-0", active ? "bg-white border-white" : "bg-black border-zinc-700 group-hover:border-zinc-500")}>
        {active && <div className="w-2 h-2 bg-black rounded-[1px]" />}
      </div>
      <div className="flex items-center gap-3">
         {Icon && <Icon className={cn("w-3 h-3", active ? "text-white" : "text-zinc-600 group-hover:text-zinc-400")} />}
         <span className={cn("text-[10px] font-bold uppercase tracking-widest pt-0.5", active ? "text-white" : "text-zinc-600 group-hover:text-zinc-400")}>{label}</span>
      </div>
    </div>
  );
}
