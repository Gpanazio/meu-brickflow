// @vitest-environment node
import express from 'express';
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  sessionService,
  userService,
  eventService,
  query,
  getClient,
  bcryptCompare,
} = vi.hoisted(() => ({
  sessionService: {
    get: vi.fn(),
  },
  userService: {
    findByUsername: vi.fn(),
  },
  eventService: {
    publish: vi.fn().mockResolvedValue(undefined),
  },
  query: vi.fn(),
  getClient: vi.fn(),
  bcryptCompare: vi.fn(),
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
    PROJECT_UPDATED: 'PROJECT_UPDATED',
  },
}));
vi.mock('../db.js', () => ({
  query,
  getClient,
}));
vi.mock('bcrypt', () => ({
  default: {
    compare: bcryptCompare,
    hash: vi.fn(),
  },
}));

import projectsRouter from '../routes/projects.js';

let server;
let baseUrl;

beforeAll(() => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api/projects', projectsRouter);
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Projects integration', () => {
  it('returns cached project state when available', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          data: {
            users: [],
            projects: [{ id: 'p1', name: 'Projeto A', password: 'secret' }],
          },
          version: 2,
        },
      ],
    });

    const first = await fetch(`${baseUrl}/api/projects`);
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({
      users: [],
      projects: [{ id: 'p1', name: 'Projeto A', password: '****' }],
      version: 2,
    });

    const second = await fetch(`${baseUrl}/api/projects`);
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({
      users: [],
      projects: [{ id: 'p1', name: 'Projeto A', password: '****' }],
      version: 2,
    });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('requires authentication when saving projects', async () => {
    const response = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { users: [], projects: [] }, version: 1 }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Not authenticated' });
  });

  it('saves project state and publishes updates for authenticated users', async () => {
    sessionService.get.mockResolvedValue({ userId: 'ana' });
    userService.findByUsername.mockResolvedValue({ username: 'ana', role: 'member' });

    const client = {
      query: vi.fn(),
      release: vi.fn(),
    };
    getClient.mockResolvedValue(client);
    client.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ data: { projects: [] }, version: 1 }],
      }) // SELECT ... FOR UPDATE
      .mockResolvedValueOnce(undefined) // INSERT event
      .mockResolvedValueOnce(undefined) // UPSERT state
      .mockResolvedValueOnce(undefined); // COMMIT

    const response = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: 'bf_session=session-123',
      },
      body: JSON.stringify({
        data: { users: [], projects: [] },
        version: 1,
        client_request_id: 'req-1',
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, version: 2 });
    expect(client.query).toHaveBeenCalledWith(
      'INSERT INTO brickflow_events (client_request_id, data) VALUES ($1, $2)',
      ['req-1', JSON.stringify({ users: [], projects: [], version: 2 })],
    );
    expect(eventService.publish).toHaveBeenCalledWith('PROJECT_UPDATED', {
      version: 2,
      userId: 'ana',
    });
  });

  it('verifies project passwords against stored hash', async () => {
    bcryptCompare.mockResolvedValue(true);
    query.mockResolvedValueOnce({
      rows: [
        {
          data: {
            projects: [{ id: 'p1', name: 'Projeto A', password: 'hash' }],
          },
        },
      ],
    });

    const response = await fetch(`${baseUrl}/api/projects/verify-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'p1', password: '1234' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(bcryptCompare).toHaveBeenCalledWith('1234', 'hash');
  });
});
