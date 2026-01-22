import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimit.js';
import { masonService } from '../services/masonService.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

router.post('/chat', requireAuth, apiLimiter, async (req, res) => {
    try {
        const { message, history, clientContext } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const response = await masonService.processMessage(
            history || [],
            message,
            { ...clientContext, userId: req.user.username } // Merge clientContext, but userId cannot be overridden
        );

        res.json({ response });
    } catch (err) {
        console.error('Mason API Error:', err);
        const logPath = path.join(process.cwd(), 'server', 'mason_debug.log');
        const logEntry = `[${new Date().toISOString()}] Error: ${err.message}\nStack: ${err.stack}\n\n`;
        try {
            fs.appendFileSync(logPath, logEntry);
        } catch (logErr) {
            console.error('Failed to write to debug log:', logErr);
        }
        res.status(500).json({ error: 'Internal Mason Error' });
    }
});

export default router;
