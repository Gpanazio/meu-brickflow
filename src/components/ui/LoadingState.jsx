import { WifiOff, Loader2 } from 'lucide-react';
import Loader from '@/components/ui/loader';

export default function LoadingState({ message, subMessage }) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-center p-4">
      <Loader />
      {message && (
        <div className="text-zinc-500 font-mono animate-pulse uppercase tracking-widest">
          {message}
        </div>
      )}
      {subMessage && (
        <p className="text-zinc-700 text-xs font-mono">{subMessage}</p>
      )}
    </div>
  );
}

export function ConnectionError({ message, onRetry }) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-red-600 gap-4 p-8 text-center">
      <WifiOff className="w-16 h-16" />
      <h1 className="text-2xl font-black uppercase">Falha na Conexão</h1>
      <p className="text-zinc-500 text-sm max-w-md">{message}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="bg-white text-black font-bold px-6 py-3 text-xs uppercase tracking-[0.2em] rounded-none hover:bg-zinc-200 transition-transform active:scale-95"
        >
          Tentar Novamente
        </button>
      )}
    </div>
  );
}
