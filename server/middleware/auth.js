import { parseCookies } from '../utils/helpers.js';
import { sessionService } from '../services/sessionService.js';
import { userService } from '../services/userService.js';

export const requireAuth = async (req, res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies.bf_session;
  if (!sessionId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const session = await sessionService.get(sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const user = await userService.findByUsername(session.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { password_hash: _, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Auth check failed' });
  }
};
