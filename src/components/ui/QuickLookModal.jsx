import React, { useEffect } from 'react';
import { Dialog, DialogContent } from './dialog';
import { X, Download, FileText, Calendar, HardDrive, Type, Music, Video } from 'lucide-react';
import { formatFileSize } from '../../utils/formatFileSize';

export function QuickLookModal({ file, isOpen, onClose }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!file) return null;

  const isImage = file.type?.includes('image');
  const isPdf = file.type?.includes('pdf');
  const isAudio = file.type?.includes('audio');
  const isVideo = file.type?.includes('video');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[850px] bg-black/95 border border-zinc-800 p-0 overflow-hidden rounded-none shadow-2xl backdrop-blur-xl scanlines">
        <div className="flex flex-col md:flex-row h-[85vh] md:h-[650px] relative z-10">
          {/* Visualização */}
          <div className="flex-1 bg-zinc-950/50 flex items-center justify-center p-4 relative border-b md:border-b-0 md:border-r border-zinc-900 group">
            {isImage ? (
              <img src={file.data} alt={file.name} className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-300" />
            ) : isPdf ? (
              <iframe src={`${file.data}#toolbar=0`} className="w-full h-full border-0 bg-white shadow-inner" title={file.name} />
            ) : isAudio ? (
              <div className="flex flex-col items-center gap-8 w-full px-8">
                <div className="w-32 h-32 bg-zinc-900 flex items-center justify-center rounded-full border border-white/5 shadow-[0_0_50px_rgba(255,255,255,0.05)] animate-pulse">
                  <Music className="w-12 h-12 text-white" />
                </div>
                <audio controls src={file.data} className="w-full h-10 invert brightness-100 opacity-80 hover:opacity-100 transition-opacity" />
              </div>
            ) : isVideo ? (
              <div className="w-full h-full flex items-center justify-center bg-black">
                <video controls src={file.data} className="max-w-full max-h-full shadow-2xl" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <FileText className="w-20 h-20 text-zinc-800" />
                <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Sem pré-visualização disponível</p>
              </div>
            )}
            
            <div className="absolute top-4 right-4 flex gap-2">
               <a 
                href={file.data} 
                download={file.name}
                className="p-2 bg-white text-black hover:bg-zinc-200 transition-colors"
                title="Download"
               >
                 <Download className="w-4 h-4" />
               </a>
               <button 
                onClick={onClose}
                className="p-2 bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
               >
                 <X className="w-4 h-4" />
               </button>
            </div>
          </div>

          {/* Metadados */}
          <div className="w-full md:w-64 p-6 space-y-6 bg-black">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-[0.2em]">Metadados</h3>
              <div className="h-px bg-zinc-900 w-full" />
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Type className="w-3 h-3" />
                  <span className="text-[10px] uppercase font-bold tracking-widest">Nome</span>
                </div>
                <p className="text-xs text-white font-mono break-all">{file.name}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-zinc-500">
                  <HardDrive className="w-3 h-3" />
                  <span className="text-[10px] uppercase font-bold tracking-widest">Tamanho</span>
                </div>
                <p className="text-xs text-white font-mono">{formatFileSize(file.size)}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-zinc-500">
                  <FileText className="w-3 h-3" />
                  <span className="text-[10px] uppercase font-bold tracking-widest">Tipo</span>
                </div>
                <p className="text-xs text-white font-mono">{file.type || 'Desconhecido'}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Calendar className="w-3 h-3" />
                  <span className="text-[10px] uppercase font-bold tracking-widest">Criado em</span>
                </div>
                <p className="text-xs text-white font-mono">{new Date(file.uploadDate).toLocaleString()}</p>
              </div>
            </div>

            <div className="pt-4">
              <div className="p-3 bg-zinc-950 border border-zinc-900">
                 <p className="text-[9px] text-zinc-700 font-mono leading-relaxed">
                   STATUS: ENCRYPTED<br/>
                   NODE: BRICKFLOW-OS<br/>
                   ACCESS: GRANTED
                 </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
