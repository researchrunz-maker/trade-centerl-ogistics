import { Router } from 'express';
import type { Request, Response } from 'express';
import { readShipments, writeShipments } from '../services/storage.js';
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
    const shipments = await readShipments();
    const raw = req.body as Partial<Shipment>;

    if (!raw.trackingNumber) {
        return res.status(400).json({ error: 'Tracking number is required' });
    }

    const existingIdx = shipments.findIndex(s => s.trackingNumber === raw.trackingNumber);

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

    if (existingIdx > -1) {
        shipments[existingIdx] = shipment;
    } else {
        shipments.push(shipment);
    }

    await writeShipments(shipments);
    res.json({ success: true, data: shipment });
});

// Delete
router.delete('/shipments/:id', isAdmin, async (req, res) => {
    let shipments = await readShipments();
    shipments = shipments.filter(s => s.id !== req.params.id);
    await writeShipments(shipments);
    res.json({ success: true });
});

export default router;
