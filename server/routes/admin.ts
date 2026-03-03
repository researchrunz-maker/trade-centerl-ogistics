import { Router } from 'express';
import type { Request, Response } from 'express';
import { readShipments, deleteShipmentById, upsertShipment } from '../services/storage.js';
import type { Shipment } from '../services/storage.js';
import crypto from 'crypto';

const router = Router();

// ── Admin Middleware (Simple) ────────────────
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const isAdmin = (req: Request, res: Response, next: any) => {
    const auth = req.headers.authorization;
    if (auth === ADMIN_PASSWORD) return next();
    res.status(401).json({ error: 'Unauthorized' });
};

// ── Admin Routes ─────────────────────────────

// List all
router.get('/shipments', isAdmin, async (_req, res) => {
    const data = await readShipments();
    res.json(data);
});

// Create/Update
router.post('/shipments', isAdmin, async (req, res) => {
    const raw = req.body as Partial<Shipment>;

    if (!raw.trackingNumber) {
        return res.status(400).json({ error: 'Tracking number is required' });
    }

    const shipment: Shipment = {
        id: raw.id || crypto.randomUUID(),
        trackingNumber: raw.trackingNumber.toUpperCase(),
        status: raw.status || 'processing',
        statusLabel: raw.statusLabel || '🔄 Processing',
        eta: raw.eta || 'TBD',
        progressPercent: raw.progressPercent || 10,
        meta: {
            origin: raw.meta?.origin || '—',
            destination: raw.meta?.destination || '—',
            carrier: raw.meta?.carrier || 'Trade Center Logistics',
            weight: raw.meta?.weight || '—',
            service: raw.meta?.service || 'Standard',
        },
        events: raw.events || []
    };

    try {
        const result = await upsertShipment(shipment);
        if (!result) {
            // This happens if Supabase is not configured yet
            return res.status(503).json({ error: 'Database is not fully configured on the server yet.' });
        }
        res.json({ success: true, data: result });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Delete
router.delete('/shipments/:id', isAdmin, async (req, res) => {
    try {
        await deleteShipmentById(req.params.id as string);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
