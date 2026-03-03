import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../data/shipments.json');

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

export async function readShipments(): Promise<Shipment[]> {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

export async function writeShipments(shipments: Shipment[]): Promise<void> {
    await fs.writeFile(DATA_FILE, JSON.stringify(shipments, null, 2));
}

export async function getShipmentByNumber(num: string): Promise<Shipment | null> {
    const shipments = await readShipments();
    return shipments.find(s => s.trackingNumber.toUpperCase() === num.toUpperCase()) || null;
}
