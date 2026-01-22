import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimit.js';
import { masonService } from '../services/masonService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const router = express.Router();

// Secure log path - use absolute path from module location
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOG_PATH = process.env.MASON_DEBUG_LOG || path.join(__dirname, '..', 'mason_debug.log');

// Sanitize log entry to prevent log injection
const sanitizeLogEntry = (str) => {
    if (!str || typeof str !== 'string') return '';
    // Replace newlines and carriage returns with spaces
    return str.replace(/[\r\n]/g, ' ').trim();
};

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

        // Sanitize error data to prevent log injection
        const sanitizedMessage = sanitizeLogEntry(err.message);
        const sanitizedStack = sanitizeLogEntry(err.stack);
        const logEntry = `[${new Date().toISOString()}] Error: ${sanitizedMessage} | Stack: ${sanitizedStack}\n`;

        // Async logging - doesn't block event loop
        fs.appendFile(LOG_PATH, logEntry).catch((logErr) => {
            console.error('Failed to write to debug log:', logErr);
        });

        res.status(500).json({ error: 'Internal Mason Error' });
    }
});

export default router;
