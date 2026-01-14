import { query } from '../db.js';
import { parseCookies } from '../utils/helpers.js';

export const requireAuth = async (req, res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies.bf_session;
  if (!sessionId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { rows } = await query('SELECT user_id FROM brickflow_sessions WHERE id = $1 AND expires_at > NOW()', [sessionId]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    const userRes = await query('SELECT username, role, name, avatar, color FROM master_users WHERE username = $1', [rows[0].user_id]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = userRes.rows[0];
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Auth check failed' });
  }
};
