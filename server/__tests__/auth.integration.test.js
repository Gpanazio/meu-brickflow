// @vitest-environment node
import express from 'express';
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { sessionService, userService, eventService } = vi.hoisted(() => ({
  sessionService: {
    create: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
  userService: {
    verifyLogin: vi.fn(),
    create: vi.fn(),
    findByUsername: vi.fn(),
  },
  eventService: {
    publish: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../middleware/rateLimit.js', () => ({
  authLimiter: (_req, _res, next) => next(),
  apiLimiter: (_req, _res, next) => next(),
  writeLimiter: (_req, _res, next) => next(),
}));

vi.mock('../services/sessionService.js', () => ({ sessionService }));
vi.mock('../services/userService.js', () => ({ userService }));
vi.mock('../services/eventService.js', () => ({
  eventService,
  CHANNELS: {
    USER_LOGGED_OUT: 'USER_LOGGED_OUT',
    USER_JOINED: 'USER_JOINED',
  },
}));

import authRouter from '../routes/auth.js';

let server;
let baseUrl;

beforeAll(() => {
  return new Promise(resolve => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/api/auth', authRouter);
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

afterAll(() => new Promise((resolve, reject) => server.close(err => (err ? reject(err) : resolve()))));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Auth integration', () => {
  it('logs in and sets a session cookie', async () => {
    userService.verifyLogin.mockResolvedValue({
      success: true,
      user: { username: 'ana', displayName: 'Ana' },
    });
    sessionService.create.mockResolvedValue('session-123');

    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'ana', pin: '1234' }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('bf_session=session-123');
    expect(await response.json()).toEqual({
      user: { username: 'ana', displayName: 'Ana' },
    });
    expect(userService.verifyLogin).toHaveBeenCalledWith('ana', '1234');
    expect(sessionService.create).toHaveBeenCalledWith('ana');
  });

  it('registers a new user and returns a session', async () => {
    userService.create.mockResolvedValue({ username: 'joao', name: 'João' });
    sessionService.create.mockResolvedValue('session-456');

    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'joao', pin: '1234', name: 'João' }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('bf_session=session-456');
    expect(await response.json()).toEqual({
      user: { username: 'joao', name: 'João' },
    });
    expect(userService.create).toHaveBeenCalled();
    expect(sessionService.create).toHaveBeenCalledWith('joao');
    expect(eventService.publish).toHaveBeenCalledWith('USER_JOINED', expect.any(Object));
  });

  it('returns the current user with a valid session cookie', async () => {
    sessionService.get.mockResolvedValue({ userId: 'ana' });
    userService.findByUsername.mockResolvedValue({
      username: 'ana',
      displayName: 'Ana',
      password_hash: 'secret',
    });

    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { cookie: 'bf_session=session-123' },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      user: { username: 'ana', displayName: 'Ana' },
    });
    expect(sessionService.get).toHaveBeenCalledWith('session-123');
    expect(userService.findByUsername).toHaveBeenCalledWith('ana');
  });

  it('logs out and clears the session cookie', async () => {
    sessionService.delete.mockResolvedValue(undefined);

    const response = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { cookie: 'bf_session=session-123' },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('bf_session=');
    expect(await response.json()).toEqual({ success: true });
    expect(sessionService.delete).toHaveBeenCalledWith('session-123');
    expect(eventService.publish).toHaveBeenCalledWith('USER_LOGGED_OUT', expect.any(Object));
  });
});
