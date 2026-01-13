import { cn } from '@/lib/utils';

export default function PrismaticPanel({ 
  children, 
  className, 
  contentClassName, 
  hoverEffect = false, 
  onClick, 
  ...props 
}) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "glass-panel group transition-all duration-300 ease-out",
        hoverEffect && "cursor-pointer hover:border-white/20 hover:-translate-y-1",
        className
      )}
      {...props}
    >
      {/* Brilho de varredura no Hover */}
      {hoverEffect && (
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0" />
      )}
      
      {/* Textura de Ruído */}
      <div className="absolute inset-0 bg-noise z-0" />

      {/* Conteúdo */}
      <div className={cn("relative z-10 w-full h-full", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
