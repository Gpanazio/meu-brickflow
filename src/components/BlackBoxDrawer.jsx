import React, { useState } from 'react';
import { Terminal, RotateCcw, Activity, X } from 'lucide-react';
import { Drawer, DrawerContent, DrawerClose } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import MechButton from '@/components/ui/MechButton';

export default function BlackBoxDrawer({ isOpen, onOpenChange, logs = [], onUndo }) {
  const [selectedLog, setSelectedLog] = useState(null);

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <Drawer direction="right" open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="h-screen top-0 right-0 left-auto mt-0 w-[500px] rounded-none border-l border-zinc-800 bg-black p-0 focus:outline-none">
        
        <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-950/30 border border-green-900/50 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-green-500 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black text-green-500 uppercase tracking-widest font-mono leading-none">
                Black Box
              </h2>
              <span className="text-[9px] text-green-700 font-mono uppercase tracking-[0.2em]">
                System Activity Log
              </span>
            </div>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white rounded-none">
              <X className="w-5 h-5" />
            </Button>
          </DrawerClose>
        </div>

        <div className="flex h-[calc(100vh-64px)]">
          
          <div className={`${selectedLog ? 'w-1/2' : 'w-full'} transition-all duration-300 border-r border-zinc-900 flex flex-col`}>
            <div className="p-4 border-b border-zinc-900 bg-black sticky top-0 z-10">
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                <Activity className="w-3 h-3" />
                Eventos Recentes ({logs.length})
              </div>
            </div>
            
            <ScrollArea className="flex-1 custom-scrollbar">
              <div className="flex flex-col divide-y divide-zinc-900/50">
                {logs.map((log) => (
                  <button
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={cn(
                      "flex flex-col gap-2 p-4 text-left transition-all hover:bg-zinc-900/30 group border-l-2",
                      selectedLog?.id === log.id 
                        ? "bg-zinc-900/50 border-green-500" 
                        : "border-transparent hover:border-zinc-700"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-mono text-green-600 group-hover:text-green-400">
                        {formatTime(log.timestamp)}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400">
                        {log.user}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-zinc-300 leading-relaxed line-clamp-2">
                      <span className="text-green-500/70 mr-2">{'>'}</span>
                      {log.message}
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {selectedLog && (
            <div className="w-1/2 flex flex-col bg-zinc-950/30 animate-in slide-in-from-right-10 duration-200">
              <div className="p-6 flex-1 overflow-y-auto">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">Detalhes do Evento</h3>
                
                <div className="space-y-6">
                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-600">ID</span>
                      <span className="text-zinc-400">{selectedLog.id}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-600">User</span>
                      <span className="text-white">{selectedLog.user}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-600">Action</span>
                      <span className="text-green-400">{selectedLog.actionType}</span>
                    </div>
                  </div>

                  {selectedLog.diff && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Alterações</span>
                      <div className="border border-zinc-800 bg-black font-mono text-[10px] p-3 rounded-sm space-y-2">
                        <div className="text-red-500/70 line-through">
                          - {selectedLog.diff.before}
                        </div>
                        <div className="text-green-500">
                          + {selectedLog.diff.after}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-zinc-900 bg-black">
                <MechButton 
                  onClick={() => onUndo(selectedLog)}
                  className="w-full text-red-500 border-red-900/30 hover:bg-red-950/20 hover:border-red-600 hover:text-red-400"
                  icon={RotateCcw}
                >
                  Reverter Ação
                </MechButton>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
