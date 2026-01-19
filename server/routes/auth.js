import express from 'express';
import process from 'process';
import { sessionService } from '../services/sessionService.js';
import { userService } from '../services/userService.js';
import { LoginSchema, RegisterSchema } from '../utils/schemas.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { eventService, CHANNELS } from '../services/eventService.js';
import { parseCookies } from '../utils/helpers.js';

const router = express.Router();

router.post('/login', authLimiter, async (req, res) => {
  try {
    const result = LoginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors });
    }

    const { username, pin } = req.body;
    const loginResult = await userService.verifyLogin(username, pin);

    if (!loginResult.success) {
      return res.status(401).json({ error: loginResult.message });
    }

    const sessionId = await sessionService.create(loginResult.user.username);
    setSessionCookie(res, sessionId);

    res.json({ user: loginResult.user });
  } catch (err) {
    console.error('Error in login:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies.bf_session;

    if (sessionId) {
      await sessionService.delete(sessionId);
    }

    res.clearCookie('bf_session');
    res.json({ success: true });

    await eventService.publish(CHANNELS.USER_LOGGED_OUT, {
      username: req.user?.username || 'unknown',
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('Error in logout:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

router.post('/register', authLimiter, async (req, res) => {
  try {
    const result = RegisterSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors });
    }

    const newUser = await userService.create(req.body);
    const sessionId = await sessionService.create(newUser.username);
    setSessionCookie(res, sessionId);

    res.json({ user: newUser });

    await eventService.publish(CHANNELS.USER_JOINED, {
      username: newUser.username,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('Error in register:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies.bf_session;

    if (!sessionId) {
      return res.json({ user: null });
    }

    const session = await sessionService.get(sessionId);
    if (!session) {
      return res.json({ user: null });
    }

    const user = await userService.findByUsername(session.userId);
    if (!user) {
      return res.json({ user: null });
    }

    const { password_hash: _, ...safeUser } = user;
    console.log('📝 GET /me returning user with avatar:', safeUser.avatar ? 'YES' : 'NO', '- username:', safeUser.username);
    res.json({ user: safeUser });
  } catch (err) {
    console.error('Error in /me:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

function setSessionCookie(res, sessionId) {
  const isSecure = process.env.NODE_ENV === 'production';
  res.cookie('bf_session', sessionId, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 2592000, // 30 dias
    path: '/'
  });
}

export default router;
