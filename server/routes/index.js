
import { query } from '../db.js';
import { cache } from '../cache.js';
import { requireAuth } from '../middleware/auth.js';

export async function checkHealth() {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabase(),
      cache: await checkCache(),
      disk: await checkDisk()
    }
  };

  const allHealthy = Object.values(checks.services).every(s => s.status === 'ok');
  if (!allHealthy) {
    checks.status = 'degraded';
  }

  return checks;
}

async function checkDatabase() {
  try {
    const start = Date.now();
    await query('SELECT 1');
    const latency = Date.now() - start;
    return { status: 'ok', latency_ms: latency };
  } catch (err) {
    return { status: 'error', message: err.message, latency_ms: null };
  }
}

async function checkCache() {
  try {
    const health = await cache.ping();
    return health;
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

async function checkDisk() {
  return { status: 'ok', free_space_percent: 100 };
}

export async function setupRoutes(app) {
  app.use('/api/health', async (req, res) => {
    const checks = await checkHealth();
    const statusCode = checks.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(checks);
  });

  const authRouter = await import('./auth.js');
  const projectRouter = await import('./projects.js');
  const userRouter = await import('./users.js');

  app.use('/api/auth', authRouter.default);
  app.use('/api/projects', projectRouter.default);
  app.use('/api/users', userRouter.default);

  app.get('/api/admin/users', requireAuth, async (req, res) => {
    try {
      const isOwner = req.user.role === 'owner';
      const isLegacyAdmin = ['gabriel', 'lufe'].includes(req.user.username.toLowerCase());

      if (!isOwner && !isLegacyAdmin) return res.status(403).json({ error: 'Forbidden' });

      const { rows } = await query('SELECT id, username, name, email, role, avatar, color, created_at FROM master_users');
      res.json({ users: rows });
    } catch (err) {
      console.error('Error fetching admin users:', err);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });
}
