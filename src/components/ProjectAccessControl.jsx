import React, { useState } from 'react';
import { Shield, UserPlus, X, Check } from 'lucide-react';
import { Button } from './ui/button';
import { getRoleLabel, getRoleColor } from '../utils/accessControl';
import { cn } from '../lib/utils';

export function ProjectAccessControl({ project, allUsers, onUpdateMembers, onClose }) {
  const [selectedUser, setSelectedUser] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const projectMembers = project.members || [];
  const availableUsers = allUsers.filter(
    u => !projectMembers.includes(u.username) && u.username !== project.createdBy
  );

  const handleAddMember = () => {
    if (!selectedUser) return;

    const updatedMembers = [...projectMembers, selectedUser];
    onUpdateMembers(updatedMembers);
    setSelectedUser('');
    setIsAdding(false);
  };

  const handleRemoveMember = (username) => {
    const updatedMembers = projectMembers.filter(m => m !== username);
    onUpdateMembers(updatedMembers);
  };

  const getMemberInfo = (username) => {
    return allUsers.find(u => u.username === username);
  };

  const creatorInfo = getMemberInfo(project.createdBy);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden bg-black border border-zinc-800 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-900">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-red-600" />
            <h2 className="brick-title text-xl uppercase tracking-tighter text-white">
              Controle de Acesso
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
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-140px)] custom-scrollbar">

          {/* Project Info */}
          <div className="border border-zinc-900 p-4 bg-zinc-950/50">
            <h3 className="brick-tech text-[10px] text-zinc-500 uppercase tracking-[0.2em] mb-2">
              Projeto
            </h3>
            <p className="brick-title text-2xl text-white uppercase tracking-tight">
              {project.name}
            </p>
          </div>

          {/* Creator */}
          <div>
            <h3 className="brick-tech text-[10px] text-zinc-500 uppercase tracking-[0.2em] mb-3">
              Proprietário
            </h3>
            {creatorInfo && (
              <div className="flex items-center justify-between border border-zinc-900 p-4 bg-black">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                    <span className="brick-title text-white text-sm">
                      {creatorInfo.displayName?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="brick-manifesto text-sm text-white uppercase tracking-wide">
                      {creatorInfo.displayName}
                    </p>
                    <p className="brick-tech text-[9px] text-zinc-600 uppercase tracking-widest">
                      @{creatorInfo.username}
                    </p>
                  </div>
                </div>
                <div className={cn("px-3 py-1 rounded-none text-[9px] font-bold uppercase tracking-widest", getRoleColor(creatorInfo.role))}>
                  {getRoleLabel(creatorInfo.role)}
                </div>
              </div>
            )}
          </div>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="brick-tech text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
                Membros com Acesso ({projectMembers.length})
              </h3>
              {!isAdding && availableUsers.length > 0 && (
                <Button
                  onClick={() => setIsAdding(true)}
                  className="bg-zinc-900 text-white hover:bg-zinc-800 h-8 px-4 text-[9px] uppercase font-bold tracking-widest rounded-none"
                >
                  <UserPlus className="mr-2 h-3 w-3" /> Adicionar
                </Button>
              )}
            </div>

            {/* Add Member Form */}
            {isAdding && (
              <div className="border border-zinc-800 p-4 bg-zinc-950/50 mb-3 space-y-3">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full bg-black border border-zinc-800 text-white px-3 py-2 text-sm rounded-none focus:outline-none focus:border-zinc-600"
                >
                  <option value="">Selecione um usuário...</option>
                  {availableUsers.map(user => (
                    <option key={user.username} value={user.username}>
                      {user.displayName} (@{user.username}) - {getRoleLabel(user.role)}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddMember}
                    disabled={!selectedUser}
                    className="flex-1 bg-white text-black hover:bg-zinc-200 h-9 text-[9px] uppercase font-bold tracking-widest rounded-none"
                  >
                    <Check className="mr-2 h-3 w-3" /> Confirmar
                  </Button>
                  <Button
                    onClick={() => {
                      setIsAdding(false);
                      setSelectedUser('');
                    }}
                    className="flex-1 bg-zinc-900 text-white hover:bg-zinc-800 h-9 text-[9px] uppercase font-bold tracking-widest rounded-none"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Members List */}
            <div className="space-y-2">
              {projectMembers.length === 0 ? (
                <div className="border border-zinc-900 p-6 text-center">
                  <p className="brick-tech text-[10px] text-zinc-700 uppercase tracking-widest">
                    Nenhum membro adicional
                  </p>
                </div>
              ) : (
                projectMembers.map(username => {
                  const memberInfo = getMemberInfo(username);
                  if (!memberInfo) return null;

                  return (
                    <div
                      key={username}
                      className="flex items-center justify-between border border-zinc-900 p-4 bg-black hover:bg-zinc-950 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                          <span className="brick-title text-white text-sm">
                            {memberInfo.displayName?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="brick-manifesto text-sm text-white uppercase tracking-wide">
                            {memberInfo.displayName}
                          </p>
                          <p className="brick-tech text-[9px] text-zinc-600 uppercase tracking-widest">
                            @{memberInfo.username}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={cn("px-3 py-1 rounded-none text-[9px] font-bold uppercase tracking-widest", getRoleColor(memberInfo.role))}>
                          {getRoleLabel(memberInfo.role)}
                        </div>
                        <button
                          onClick={() => handleRemoveMember(username)}
                          className="text-zinc-700 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Help Text */}
          <div className="border border-zinc-900 p-4 bg-zinc-950/30">
            <p className="brick-tech text-[9px] text-zinc-600 uppercase tracking-widest leading-relaxed">
              Membros adicionados terão acesso para visualizar e trabalhar neste projeto.
              O proprietário sempre mantém controle total sobre o projeto.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-zinc-900">
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
