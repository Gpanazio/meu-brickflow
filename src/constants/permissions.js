/**
 * Centralized permission settings.
 * Edit ADMIN_USERS to grant team management access.
 */

// Users with elevated permissions (team management, settings, etc.)
export const ADMIN_USERS = ['gabriel', 'lufe'];

/**
 * Check if a user has admin privileges.
 * @param {string | undefined} username 
 * @returns {boolean}
 */
export function isAdmin(username) {
    return ADMIN_USERS.includes(String(username || '').toLowerCase());
}
