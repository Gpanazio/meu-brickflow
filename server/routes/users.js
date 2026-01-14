import express from 'express';
import { userService } from '../services/userService.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const users = await userService.getAll();
    res.json({ users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/', async (req, res) => {
  try {
    const user = await userService.create(req.body);
    res.json({ user });
  } catch (err) {
    console.error('Error creating user:', err);
    const message = err?.message || 'Failed to create user';
    res.status(400).json({ error: message });
  }
});

// IMPORTANT: /me routes MUST come BEFORE /:username to avoid being captured
router.put('/me', requireAuth, async (req, res) => {
  try {
    console.log('📝 PUT /me called for user:', req.user?.username);
    console.log('📝 Request body:', JSON.stringify(req.body));
    const user = await userService.updateProfile(req.user.username, req.body);
    console.log('📝 Updated user:', JSON.stringify(user));
    res.json({ user });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Dynamic route MUST be last
router.get('/:username', requireAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const user = await userService.findByUsername(username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { password_hash: _, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
