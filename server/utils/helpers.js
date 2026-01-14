import { fileURLToPath } from 'url';
import path from 'path';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const isProd = process.env.NODE_ENV === 'production';

export const isRequestSecure = (req) => {
  if (req.secure) return true;
  const protoHeader = req.headers['x-forwarded-proto'];
  return protoHeader === 'https';
};

export const normalizeStateData = (state) => {
  if (!state) return null;
  if (Array.isArray(state)) return { projects: state };
  return state;
};

export const parseCookies = (cookieHeader) => {
  if (!cookieHeader) return {};
  const result = {};
  cookieHeader.split(';').forEach((part) => {
    const [key, value] = part.trim().split('=');
    if (key) result[key] = decodeURIComponent(value || '');
  });
  return result;
};

export const setSessionCookie = (req, res, sessionId) => {
  const parts = [
    `bf_session=${encodeURIComponent(sessionId)}`,
    'Max-Age=2592000',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax'
  ];
  if (isProd && isRequestSecure(req)) {
    parts.push('Secure');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
};

export const getDistPath = () => {
  return path.resolve(__dirname, '../../dist');
};
