/**
 * Sistema de Controle de Acesso BrickFlow
 *
 * Roles:
 * - OWNER: Dono da empresa (todos os privilégios)
 * - ADMIN: Administrador (gerencia usuários e projetos)
 * - MEMBER: Membro comum (acesso aos projetos atribuídos)
 * - VIEWER: Apenas visualização (read-only)
 * - GUEST: Convidado temporário (read-only via link)
 */

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
  GUEST: 'guest'
};

export const PERMISSIONS = {
  // Permissões de usuário
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',

  // Permissões de projeto
  CREATE_PROJECT: 'create_project',
  DELETE_PROJECT: 'delete_project',
  EDIT_PROJECT: 'edit_project',
  VIEW_PROJECT: 'view_project',
  ARCHIVE_PROJECT: 'archive_project',

  // Permissões de sub-projeto
  CREATE_SUBPROJECT: 'create_subproject',
  DELETE_SUBPROJECT: 'delete_subproject',
  EDIT_SUBPROJECT: 'edit_subproject',

  // Permissões de tarefa
  CREATE_TASK: 'create_task',
  DELETE_TASK: 'delete_task',
  EDIT_TASK: 'edit_task',
  ASSIGN_TASK: 'assign_task',

  // Permissões de sistema
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_HISTORY: 'view_history',
  MANAGE_BACKUPS: 'manage_backups',
  ACCESS_TRASH: 'access_trash'
};

// Mapeamento de roles para permissões
const ROLE_PERMISSIONS = {
  [ROLES.OWNER]: [
    // Usuários
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_USERS,

    // Projetos
    PERMISSIONS.CREATE_PROJECT,
    PERMISSIONS.DELETE_PROJECT,
    PERMISSIONS.EDIT_PROJECT,
    PERMISSIONS.VIEW_PROJECT,
    PERMISSIONS.ARCHIVE_PROJECT,

    // Sub-projetos
    PERMISSIONS.CREATE_SUBPROJECT,
    PERMISSIONS.DELETE_SUBPROJECT,
    PERMISSIONS.EDIT_SUBPROJECT,

    // Tarefas
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.DELETE_TASK,
    PERMISSIONS.EDIT_TASK,
    PERMISSIONS.ASSIGN_TASK,

    // Sistema
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.VIEW_HISTORY,
    PERMISSIONS.MANAGE_BACKUPS,
    PERMISSIONS.ACCESS_TRASH
  ],

  [ROLES.ADMIN]: [
    // Usuários
    PERMISSIONS.VIEW_USERS,

    // Projetos
    PERMISSIONS.CREATE_PROJECT,
    PERMISSIONS.EDIT_PROJECT,
    PERMISSIONS.VIEW_PROJECT,
    PERMISSIONS.ARCHIVE_PROJECT,

    // Sub-projetos
    PERMISSIONS.CREATE_SUBPROJECT,
    PERMISSIONS.EDIT_SUBPROJECT,

    // Tarefas
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.EDIT_TASK,
    PERMISSIONS.ASSIGN_TASK,

    // Sistema
    PERMISSIONS.VIEW_HISTORY,
    PERMISSIONS.ACCESS_TRASH
  ],

  [ROLES.MEMBER]: [
    // Projetos (apenas os atribuídos)
    PERMISSIONS.VIEW_PROJECT,

    // Sub-projetos (apenas os atribuídos)
    PERMISSIONS.CREATE_SUBPROJECT,
    PERMISSIONS.EDIT_SUBPROJECT,

    // Tarefas
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.EDIT_TASK,
    PERMISSIONS.ASSIGN_TASK
  ],

  [ROLES.VIEWER]: [
    // Apenas visualização
    PERMISSIONS.VIEW_PROJECT
  ],

  [ROLES.GUEST]: [
    // Convidado: apenas visualização (igual VIEWER)
    PERMISSIONS.VIEW_PROJECT
  ]
};

/**
 * Verifica se um usuário tem uma permissão específica
 * @param {Object} user - Objeto do usuário
 * @param {string} permission - Permissão a verificar
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  if (!user || !user.role) return false;

  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  return rolePermissions.includes(permission);
}

/**
 * Verifica se um usuário tem acesso a um projeto específico
 * @param {Object} user - Objeto do usuário
 * @param {Object} project - Objeto do projeto
 * @returns {boolean}
 */
export function canAccessProject(user, project) {
  if (!user || !project) return false;

  // Owner e Admin têm acesso a todos os projetos
  if (user.role === ROLES.OWNER || user.role === ROLES.ADMIN) {
    return true;
  }

  // Criador do projeto sempre tem acesso
  if (project.createdBy === user.username) {
    return true;
  }

  // Verifica se o usuário está na lista de membros do projeto
  if (project.members && project.members.includes(user.username)) {
    return true;
  }

  // Verifica se o usuário tem tarefas atribuídas neste projeto
  if (project.subProjects) {
    for (const subProject of project.subProjects) {
      const boardData = subProject.boardData || {};
      for (const board of Object.values(boardData)) {
        if (board.lists) {
          for (const list of board.lists) {
            if (list.tasks) {
              for (const task of list.tasks) {
                if (task.responsibleUsers && task.responsibleUsers.includes(user.username)) {
                  return true;
                }
              }
            }
          }
        }
      }
    }
  }

  return false;
}

/**
 * Verifica se um usuário pode editar um projeto
 * @param {Object} user - Objeto do usuário
 * @param {Object} project - Objeto do projeto
 * @returns {boolean}
 */
export function canEditProject(user, project) {
  if (!user || !project) return false;

  // Precisa ter a permissão de editar projetos
  if (!hasPermission(user, PERMISSIONS.EDIT_PROJECT)) {
    return false;
  }

  // Owner e Admin podem editar qualquer projeto
  if (user.role === ROLES.OWNER || user.role === ROLES.ADMIN) {
    return true;
  }

  // Criador pode editar seu próprio projeto
  if (project.createdBy === user.username) {
    return true;
  }

  return false;
}

/**
 * Verifica se um usuário pode deletar um projeto
 * @param {Object} user - Objeto do usuário
 * @param {Object} project - Objeto do projeto
 * @returns {boolean}
 */
export function canDeleteProject(user, project) {
  if (!user || !project) return false;

  // Apenas Owner e Admin podem deletar projetos
  if (!hasPermission(user, PERMISSIONS.DELETE_PROJECT)) {
    return false;
  }

  return user.role === ROLES.OWNER || user.role === ROLES.ADMIN;
}

/**
 * Filtra projetos baseado no acesso do usuário
 * @param {Array} projects - Array de projetos
 * @param {Object} user - Objeto do usuário
 * @returns {Array} Projetos filtrados
 */
export function filterProjectsByAccess(projects, user) {
  if (!user || !projects) return [];

  // Owner e Admin veem todos os projetos
  return projects;
}

/**
 * Obtém o label legível de um role
 * @param {string} role - Role do usuário
 * @returns {string}
 */
export function getRoleLabel(role) {
  const labels = {
    [ROLES.OWNER]: 'Proprietário',
    [ROLES.ADMIN]: 'Administrador',
    [ROLES.MEMBER]: 'Membro',
    [ROLES.VIEWER]: 'Visualizador',
    [ROLES.GUEST]: 'Convidado'
  };

  return labels[role] || 'Desconhecido';
}

/**
 * Obtém a cor do badge de um role
 * @param {string} role - Role do usuário
 * @returns {string}
 */
export function getRoleColor(role) {
  const colors = {
    [ROLES.OWNER]: 'bg-red-600 text-white',
    [ROLES.ADMIN]: 'bg-orange-600 text-white',
    [ROLES.MEMBER]: 'bg-blue-600 text-white',
    [ROLES.VIEWER]: 'bg-zinc-600 text-white',
    [ROLES.GUEST]: 'bg-purple-600 text-white'
  };

  return colors[role] || 'bg-zinc-800 text-white';
}

/**
 * Gera um token de convidado único
 * @returns {string} Token único para compartilhar
 */
export function generateGuestToken() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `guest_${timestamp}_${random}`;
}

/**
 * Verifica se um token de convidado é válido
 * @param {string} token - Token a verificar
 * @returns {boolean}
 */
export function isValidGuestToken(token) {
  if (!token || typeof token !== 'string') return false;
  return token.startsWith('guest_');
}

/**
 * Cria um usuário convidado a partir de um token
 * @param {string} token - Token do convidado
 * @returns {Object} Objeto de usuário convidado
 */
export function createGuestUser(token) {
  return {
    username: `guest_${token.split('_')[1]}`,
    displayName: 'Convidado',
    role: ROLES.GUEST,
    color: 'purple',
    avatar: '',
    isGuest: true,
    guestToken: token
  };
}

/**
 * Gera URL de convite com token
 * @returns {string} URL completa com token de convidado
 */
export function generateGuestInviteUrl() {
  const token = generateGuestToken();
  const baseUrl = window.location.origin;
  return `${baseUrl}?guest=${token}`;
}
