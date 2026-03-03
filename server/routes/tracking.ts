import { Router } from 'express';
import type { Request, Response } from 'express';
import { getShipmentByNumber } from '../services/storage.js';

const router = Router();

/**
 * GET /api/track/:number
 * Returns fake tracking data from the internal JSON "database".
 */
router.get('/:number', async (req: Request, res: Response) => {
    const rawNumber = req.params.number as string | undefined;
    const trackingNumber = rawNumber?.trim().toUpperCase();

    if (!trackingNumber || trackingNumber.length < 3) {
        res.status(400).json({ error: 'Please provide a valid tracking number.' });
        return;
    }

    try {
        const shipment = await getShipmentByNumber(trackingNumber);
        if (!shipment) {
            res.status(404).json({ error: `No shipment found for ${trackingNumber}. Please check the number and try again.` });
            return;
        }
        res.json({ success: true, data: shipment });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Database error.';
        console.error(`[track/${trackingNumber}]`, message);
        res.status(500).json({ error: message });
    }
});

export default router;
