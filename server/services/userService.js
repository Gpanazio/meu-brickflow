import bcrypt from 'bcrypt';
import { query } from '../db.js';
import { cache } from '../cache.js';

const CACHE_KEY_USERS = 'users:all';
const CACHE_TTL_USERS = 300; // 5 minutos

export const userService = {
  async getAll() {
    try {
      const cached = await cache.get(CACHE_KEY_USERS);
      if (cached) {
        console.log('📦 Cache HIT: users');
        return cached;
      }

      console.log('📦 Cache MISS: users');
      const { rows } = await query(
        'SELECT id, username, name, name as "displayName", email, avatar, color, role, created_at FROM master_users ORDER BY username ASC'
      );

      await cache.set(CACHE_KEY_USERS, rows, CACHE_TTL_USERS);
      return rows;
    } catch (err) {
      console.error('❌ Erro ao buscar usuários:', err);
      return [];
    }
  },

  async create(userData) {
    try {
      const { username, name, email, password, pin, color, role = 'user' } = userData;

      const passwordToUse = password || pin;
      const password_hash = await bcrypt.hash(passwordToUse, 10);

      const { rows } = await query(
        'INSERT INTO master_users (username, name, email, password_hash, color, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [username, name, email, password_hash, color, role]
      );

      await cache.del(CACHE_KEY_USERS);
      console.log('✅ Usuário criado:', username);
      return rows[0];
    } catch (err) {
      if (err.code === '23505') { // Fix #17: Handle unique constraint violation
        throw new Error('Usuário já existe');
      }
      console.error('❌ Erro ao criar usuário:', err);
      throw err;
    }
  },

  async findByUsername(username) {
    try {
      const { rows } = await query(
        'SELECT * FROM master_users WHERE username = $1',
        [username]
      );
      return rows[0] || null;
    } catch (err) {
      console.error('❌ Erro ao buscar usuário por username:', err);
      return null;
    }
  },

  async verifyLogin(username, pin) {
    try {
      const user = await this.findByUsername(username);
      if (!user) {
        return { success: false, message: 'Usuário não encontrado' };
      }

      const isValid = await bcrypt.compare(pin, user.password_hash);
      if (!isValid) {
        return { success: false, message: 'PIN incorreto' };
      }

      const { password_hash: _, ...safeUser } = user;
      safeUser.displayName = safeUser.name;
      return { success: true, user: safeUser };
    } catch (err) {
      console.error('❌ Erro ao verificar login:', err);
      return { success: false, message: 'Erro ao verificar login' };
    }
  },

  async updateProfile(username, data) {
    try {
      const { name, displayName, email, avatar, color } = data;
      const finalName = name || displayName;

      const { rows } = await query(
        'UPDATE master_users SET name = COALESCE($2, name), email = COALESCE($3, email), avatar = COALESCE($4, avatar), color = COALESCE($5, color) WHERE username = $1 RETURNING id, username, name, email, avatar, color, role, created_at',
        [username, finalName, email, avatar, color]
      );

      const updatedUser = rows[0];
      if (updatedUser) updatedUser.displayName = updatedUser.name;

      await cache.del(CACHE_KEY_USERS);
      return updatedUser;
    } catch (err) {
      console.error('❌ Erro ao atualizar perfil:', err);
      throw err;
    }
  }
};
