import express from 'express';
import cors from 'cors';
import trackingRouter from './routes/tracking.js';
import adminRouter from './routes/admin.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Middleware ────────────────────────────────
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ── Routes ────────────────────────────────────
app.use('/api/track', trackingRouter);
app.use('/api/admin', adminRouter);

// ── Health check ──────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 handler ───────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// ── Start (local dev only) ────────────────────
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Trade Center Logistics API running on http://localhost:${PORT}`);
    });
}

export default app;
