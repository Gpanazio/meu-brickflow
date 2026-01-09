import React, { useState } from 'react';
import { Link2, Copy, Check, X } from 'lucide-react';
import { Button } from './ui/button';
import { generateGuestInviteUrl } from '../utils/accessControl';

export function GuestInviteModal({ onClose }) {
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = () => {
    const url = generateGuestInviteUrl();
    setInviteUrl(url);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  React.useEffect(() => {
    handleGenerateLink();
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden bg-black border border-zinc-800 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-900">
          <div className="flex items-center gap-3">
            <Link2 className="w-5 h-5 text-purple-600" />
            <h2 className="brick-title text-xl uppercase tracking-tighter text-white">
              Convite de Convidado
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">

          {/* Info */}
          <div className="border border-purple-900 p-4 bg-purple-950/20">
            <p className="brick-tech text-[10px] text-purple-400 uppercase tracking-widest leading-relaxed">
              Este link permite acesso de somente leitura à plataforma.
              O convidado pode visualizar tudo mas não pode editar nada.
            </p>
          </div>

          {/* Link Display */}
          <div>
            <h3 className="brick-tech text-[10px] text-zinc-500 uppercase tracking-[0.2em] mb-3">
              Link de Convite
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteUrl}
                readOnly
                className="flex-1 bg-zinc-950 border border-zinc-800 text-white px-4 py-3 text-sm font-mono rounded-none focus:outline-none focus:border-purple-600"
              />
              <Button
                onClick={handleCopyLink}
                className="bg-purple-600 text-white hover:bg-purple-700 h-auto px-6 text-[10px] uppercase font-bold tracking-widest rounded-none"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" /> Copiar
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="border border-zinc-900 p-4 bg-zinc-950/30">
            <h3 className="brick-tech text-[10px] text-zinc-500 uppercase tracking-[0.2em] mb-3">
              Como usar
            </h3>
            <ol className="space-y-2 brick-tech text-[9px] text-zinc-600 uppercase tracking-widest leading-relaxed">
              <li>1. Copie o link acima</li>
              <li>2. Compartilhe com quem você deseja dar acesso</li>
              <li>3. Ao abrir o link, a pessoa entrará automaticamente como convidado</li>
              <li>4. O convidado terá acesso somente de leitura</li>
            </ol>
          </div>

          {/* Warning */}
          <div className="border border-orange-900 p-4 bg-orange-950/20">
            <p className="brick-tech text-[9px] text-orange-400 uppercase tracking-widest leading-relaxed">
              ⚠️ Atenção: Qualquer pessoa com este link terá acesso de visualização à plataforma.
              Compartilhe apenas com pessoas confiáveis.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-between gap-3 p-6 border-t border-zinc-900">
          <Button
            onClick={handleGenerateLink}
            className="bg-zinc-900 text-white hover:bg-zinc-800 h-10 px-8 text-[10px] uppercase font-black tracking-[0.2em] rounded-none"
          >
            Gerar Novo Link
          </Button>
          <Button
            onClick={onClose}
            className="bg-white text-black hover:bg-zinc-200 h-10 px-8 text-[10px] uppercase font-black tracking-[0.2em] rounded-none"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
