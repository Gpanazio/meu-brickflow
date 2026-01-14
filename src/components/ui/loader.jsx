import { Loader2 } from 'lucide-react';

export default function Loader({ size = 'md', text }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={`animate-spin text-zinc-500 ${sizeClasses[size]}`} />
      {text && <p className="text-xs text-zinc-600 font-mono uppercase tracking-widest">{text}</p>}
    </div>
  );
}
