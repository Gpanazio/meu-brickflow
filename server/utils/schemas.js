import { z } from 'zod';

export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50),
  pin: z.union([z.string(), z.number()]).transform(val => String(val)).refine(val => /^\d+$/.test(val), 'PIN must be numeric'),
});

export const RegisterSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  pin: z.union([z.string(), z.number()]).transform(val => String(val)).refine(val => /^\d{4,}$/.test(val), 'PIN must be at least 4 digits'),
  name: z.string().min(1, 'Name is required').max(100),
  role: z.enum(['admin', 'user', 'viewer', 'owner']).default('user'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  avatar: z.string().url('Invalid avatar URL').optional().or(z.literal('')),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color').optional().or(z.literal('')),
});

export const UserUpdateSchema = RegisterSchema.partial();

export const SaveProjectSchema = z.object({
  data: z.record(z.any()),
  version: z.number().int().nonnegative(),
  client_request_id: z.string().min(1, 'Request ID is required'),
});

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  password: z.string().optional().or(z.literal('')),
  enabledTabs: z.array(z.string()).optional(),
});
