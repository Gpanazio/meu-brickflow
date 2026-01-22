import React, { useState, useRef, useEffect } from 'react';
import { Send, Minimize2, Maximize2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function MasonFloating({ clientContext }) {
    const [isOpen, setIsOpen] = useState(false); // false = collapsed (orb), true = expanded (chat)
    const [messages, setMessages] = useState([
        { role: 'ai', content: '**SISTEMA ONLINE. PROTOCOLO 3.7 ATIVO.**\n\nSou Mason. Inteligência de produção autônoma.\n\nNão sou apenas um assistente. Eu **observo**, **analiso** e **executo**.\n\nDiga o que precisa. Ou deixe que eu identifique.', isInitial: true }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);
    const constraintsRef = useRef(null); // Ref for drag constraints (usually the screen)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Filtrar mensagens iniciais/sistema e garantir que histórico comece com 'user'
            let history = messages
                .filter(m => !m.isInitial) // Não enviar mensagem de boas-vindas
                .map(m => ({ role: m.role, content: m.content }));

            // Garantir que histórico comece com 'user', remover mensagens iniciais da AI
            while (history.length > 0 && history[0].role === 'ai') {
                history.shift();
            }

            const response = await fetch('/api/mason/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg.content,
                    history: history,
                    clientContext: clientContext
                })
            });

            const data = await response.json();

            if (data.error) throw new Error(data.error);

            setMessages(prev => [...prev, { role: 'ai', content: data.response }]);
        } catch (error) {
            console.error('Mason Error:', error);
            setMessages(prev => [...prev, { role: 'ai', content: '**FALHA CRÍTICA DE SISTEMA.**\n\nConexão interrompida. Reiniciando protocolos...' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Drag Constraints Wrapper (Full Screen, Pointer Events None) */}
            <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-[100] overflow-hidden" />

            {/* Draggable Widget */}
            <motion.div
                drag
                dragMomentum={false}
                dragConstraints={constraintsRef}
                className="fixed bottom-6 right-6 z-[101] pointer-events-auto"
            >
                <AnimatePresence mode="wait" initial={false}>
                    {!isOpen ? (
                        /* === COLLAPSED STATE (ORB) === */
                        <motion.div
                            key="orb"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            onClick={() => setIsOpen(true)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="cursor-pointer group relative"
                        >
                            {/* Glow Effect */}
                            <div className="absolute inset-0 bg-red-600 blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full animate-pulse" />

                            {/* Orb Body */}
                            <div className="w-16 h-16 bg-black border border-red-500/30 rounded-full flex items-center justify-center relative overflow-hidden shadow-[0_0_30px_rgba(220,38,38,0.3)] backdrop-blur-md">
                                {/* Scanline */}
                                <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] opacity-20 pointer-events-none" />

                                {/* Inner Eye */}
                                <div className={cn(
                                    "w-4 h-4 bg-red-600 rounded-full transition-all duration-300",
                                    isLoading ? "animate-ping opacity-75" : "shadow-[0_0_10px_rgba(220,38,38,1)]"
                                )} />
                            </div>
                        </motion.div>
                    ) : (
                        /* === EXPANDED STATE (CHAT WINDOW) === */
                        <motion.div
                            key="window"
                            initial={{ scale: 0.8, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 20 }}
                            className="w-[380px] h-[600px] flex flex-col bg-[#050505]/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl overflow-hidden relative"
                        >
                            {/* Noise Overlay */}
                            <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]" style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                            }}></div>

                            {/* Deep Red Radial Glow */}
                            <div className="absolute top-0 right-0 w-full h-full pointer-events-none z-0 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.08),transparent_70%)]" />

                            {/* Header */}
                            <div
                                className="h-12 border-b border-white/10 flex items-center justify-between px-4 bg-black/40 cursor-grab active:cursor-grabbing flex-shrink-0 z-10"
                                onPointerDown={(e) => e.preventDefault()} // Allow dragging from header
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
                                    <span className="font-black text-xs tracking-[0.2em] text-white/90 font-mono">MASON v3.7</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                                        className="p-1.5 hover:bg-white/10 rounded text-zinc-500 hover:text-white transition-colors"
                                    >
                                        <Minimize2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Chat Area */}
                            <ScrollArea className="flex-1 p-4 z-10">
                                <div className="flex flex-col gap-4 pb-4">
                                    {messages.map((msg, index) => (
                                        <div key={index} className={cn("flex flex-col gap-1", msg.role === 'user' ? "items-end" : "items-start")}>
                                            <div className={cn(
                                                "max-w-[85%] rounded px-3 py-2 text-xs font-mono leading-relaxed border",
                                                msg.role === 'user'
                                                    ? "bg-zinc-900 border-zinc-800 text-zinc-300 rounded-br-none"
                                                    : "bg-red-950/10 border-red-900/20 text-red-100 rounded-bl-none shadow-[0_0_15px_rgba(220,38,38,0.05)]"
                                            )}>
                                                <div className="prose prose-invert prose-xs max-w-none prose-p:mb-2 prose-p:last:mb-0 prose-strong:text-red-400">
                                                    <ReactMarkdown
                                                        rehypePlugins={[rehypeSanitize]}
                                                        components={{
                                                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />
                                                        }}
                                                    >
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                            <span className="text-[9px] uppercase tracking-wider text-zinc-700 font-mono">
                                                {msg.role === 'user' ? 'OPR-1' : 'SYS-AI'}
                                            </span>
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex flex-col gap-2 ml-1">
                                            <div className="flex items-center gap-2 text-red-500/50 text-[10px] font-mono tracking-widest animate-pulse">
                                                <span>COMPUTING</span>
                                                <span className="animate-bounce">.</span>
                                                <span className="animate-bounce delay-100">.</span>
                                                <span className="animate-bounce delay-200">.</span>
                                            </div>
                                            <div className="text-[9px] text-zinc-600 font-mono">
                                                Executando protocolos de estruturação...
                                            </div>
                                        </div>
                                    )}
                                    <div ref={scrollRef} />
                                </div>
                            </ScrollArea>

                            {/* Input Area */}
                            <div className="p-3 border-t border-white/10 bg-black/60 z-10">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Command..."
                                        className="flex-1 bg-zinc-900/50 border border-white/5 rounded px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-700 focus:outline-none focus:border-red-900/50 focus:ring-1 focus:ring-red-900/20 transition-all"
                                        disabled={isLoading}
                                        autoFocus
                                    />
                                    <Button
                                        size="icon"
                                        onClick={handleSend}
                                        disabled={isLoading || !input.trim()}
                                        className="h-8 w-8 bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/30 rounded"
                                    >
                                        <Send className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>

                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div >
        </>
    );
}
