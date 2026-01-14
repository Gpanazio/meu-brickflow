import express from 'express';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import process from 'process';

// Imports Modulares
import { hasDatabaseUrl } from './db.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { setupRoutes } from './routes/index.js';
import { isProd, getDistPath } from './utils/helpers.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://api.dicebear.com", "https://*.githubusercontent.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://flow.brick.mov", "https://*.railway.app"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS configuration - Applied ONLY to /api
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(',')
  .map(o => o.trim())
  .filter(o => o.length > 0);

app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  const host = req.headers.host;

  // Whitelist from env
  const isWhitelisted = origin ? allowedOrigins.includes(origin) : true;

  // Specific check for the known production domain to avoid issues with Host vs Origin mismatch
  const isKnownProd = origin === 'https://flow.brick.mov';

  // Check if it's same-origin manually if host is available
  let isSameOrigin = false;
  if (origin && host) {
    const protocol = isProd ? 'https' : req.protocol;
    isSameOrigin = origin === `${protocol}://${host}`;
  }

  const shouldAllow = !isProd || isWhitelisted || isKnownProd || isSameOrigin || !origin;

  if (shouldAllow) {
    cors({
      origin: origin || true,
      credentials: true
    })(req, res, next);
  } else {
    console.warn(`[CORS] Rejected: ${origin}. Whitelist: ${allowedOrigins.join(', ')}`);
    res.status(403).json({ error: 'CORS Policy: Origin not allowed' });
  }
});

// Apply general API rate limit
app.use('/api/', apiLimiter);

// Setup centralized routes with multi-camada health check
await setupRoutes(app);

// Static files and SPA fallback - MUST be after routes
const distPath = getDistPath();
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Global Error Handler
app.use((err, req, res) => {
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({ error: 'CORS Policy: Origin not allowed' });
  } else {
    console.error('Unhandled Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

if (hasDatabaseUrl) {
  // A conexão é testada e gerenciada dentro de db.js com suporte a fallback
}

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
