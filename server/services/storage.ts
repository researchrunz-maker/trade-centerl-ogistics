import { createClient } from '@supabase/supabase-js';

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

let supabaseInstance: any = null;

export function getSupabase() {
    if (supabaseInstance) return supabaseInstance;

    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

    if (supabaseUrl && supabaseKey) {
        supabaseInstance = createClient(supabaseUrl, supabaseKey);
        return supabaseInstance;
    }
    return null;
}

function mapDbRowToShipment(row: any): Shipment {
    return {
        id: row.id,
        trackingNumber: row.tracking_number,
        status: row.status as Shipment['status'],
        statusLabel: row.status_label,
        eta: row.eta,
        progressPercent: typeof row.progress_percent === 'string' ? parseFloat(row.progress_percent) : (row.progress_percent || 0),
        meta: row.meta || {},
        events: row.events || []
    };
}

function mapShipmentToDbRow(shipment: Shipment): any {
    return {
        id: shipment.id,
        tracking_number: shipment.trackingNumber,
        status: shipment.status,
        status_label: shipment.statusLabel,
        eta: shipment.eta,
        progress_percent: shipment.progressPercent,
        meta: shipment.meta,
        events: shipment.events
    };
}

export async function readShipments(): Promise<Shipment[]> {
    const supabase = getSupabase();
    if (!supabase) {
        console.warn('Supabase not configured. Returning empty array.');
        return [];
    }
    const { data, error } = await supabase.from('shipments').select('*');
    if (error) {
        console.error('Error reading shipments from Supabase:', error);
        return [];
    }
    return (data || []).map(mapDbRowToShipment);
}

export async function writeShipments(data: Shipment[]): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;
    if (data.length === 0) return;
    const rows = data.map(mapShipmentToDbRow);
    const { error } = await supabase.from('shipments').upsert(rows);
    if (error) {
        console.error('Error writing shipments to Supabase:', error);
    }
}

export async function getShipmentByNumber(num: string): Promise<Shipment | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .ilike('tracking_number', num)
        .maybeSingle();

    if (error) {
        console.error('Error getting shipment by number from Supabase:', error);
        return null;
    }
    return data ? mapDbRowToShipment(data) : null;
}

export async function deleteShipmentById(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;
    const { error } = await supabase.from('shipments').delete().eq('id', id);
    if (error) {
        console.error('Error deleting shipment:', error);
        return false;
    }
    return true;
}

export async function upsertShipment(shipment: Shipment): Promise<Shipment | null> {
    const supabase = getSupabase();
    if (!supabase) {
        console.warn('Supabase not configured.');
        return null; // Return null if not configured to gracefully fail
    }
    const row = mapShipmentToDbRow(shipment);

    const { data, error } = await supabase
        .from('shipments')
        .upsert(row)
        .select()
        .single();

    if (error) {
        console.error('Error upserting shipment:', error);
        throw error;
    }
    return data ? mapDbRowToShipment(data) : null;
}
