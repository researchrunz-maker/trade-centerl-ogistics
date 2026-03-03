export interface TrackingEvent {
    status: string;
    location: string;
    timestamp: string;
    done: boolean;
    active: boolean;
}

export interface Shipment {
    id: string;
    trackingNumber: string;
    status: 'in-transit' | 'delivered' | 'out-delivery' | 'processing' | 'exception';
    statusLabel: string;
    eta: string;
    progressPercent: number;
    meta: {
        origin: string;
        destination: string;
        carrier: string;
        weight: string;
        service: string;
    };
    events: TrackingEvent[];
}

// ── In-Memory Storage ─────────────────────────
// Vercel serverless functions have a read-only filesystem,
// so we use in-memory storage. Data persists as long as
// the serverless function instance is warm.
let shipments: Shipment[] = [];

export async function readShipments(): Promise<Shipment[]> {
    return shipments;
}

export async function writeShipments(data: Shipment[]): Promise<void> {
    shipments = data;
}

export async function getShipmentByNumber(num: string): Promise<Shipment | null> {
    return shipments.find(s => s.trackingNumber.toUpperCase() === num.toUpperCase()) || null;
}
