import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

import express from 'express';
import cors from 'cors';
import trackingRouter from './routes/tracking.js';
import adminRouter from './routes/admin.js';

const app = express();
const PORT = process.env.PORT ?? 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// ── Middleware ────────────────────────────────
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? true // Allows all origins in production, or specify your domain
        : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// ── Routes ────────────────────────────────────
app.use('/api/track', trackingRouter);
app.use('/api/admin', adminRouter);

// ── Health check ──────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Catch-all for Frontend ────────────────────
app.get('*', (req, res, next) => {
    // If it's an API request or a specific static file request, let it pass
    if (req.path.startsWith('/api') || req.path.endsWith('.html')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
});

// ── 404 handler ───────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// ── Start ─────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Trade Center Logistics API running on http://localhost:${PORT}`);
        console.log(`   Admin Password: ${ADMIN_PASSWORD} (set ADMIN_PASSWORD in .env to change)`);
    });
}

export default app;
