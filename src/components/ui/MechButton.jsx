import React from 'react';
import { cn } from '@/lib/utils';

export default function MechButton({ 
  children, 
  primary = false, 
  icon: Icon, 
  className, 
  onClick,
  type = "button",
  disabled = false
}) {
  return (
    <button 
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(`
        relative overflow-hidden group
        h-10 px-6 flex items-center justify-center gap-3
        uppercase text-[10px] font-black tracking-[0.2em]
        transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none
        ${primary 
          ? 'bg-white text-black hover:bg-zinc-200' 
          : 'bg-transparent text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-600 hover:bg-white/5'}
      `, className)}
    >
      {Icon && <Icon className="w-3 h-3" />}
      <span className="relative z-10">{children}</span>
      
      {primary && (
        <div className="absolute inset-0 bg-white mix-blend-overlay opacity-0 group-hover:opacity-20 transition-opacity" />
      )}
      
      {/* Subtle scanline effect on hover */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] transition-opacity" />
    </button>
  );
}
