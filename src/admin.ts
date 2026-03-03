// ── Config ───────────────────────────────────
const API_BASE = 'http://localhost:3001';
let ADMIN_TOKEN = '';

// ── Types ────────────────────────────────────
interface TrackingEvent {
    status: string;
    location: string;
    timestamp: string;
    done: boolean;
    active: boolean;
}

interface Shipment {
    id: string;
    trackingNumber: string;
    status: string;
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

const STATUS_CONFIG: Record<string, { label: string; progress: number }> = {
    'processing': { label: '🔄 Processing', progress: 15 },
    'in-transit': { label: '🚚 In Transit', progress: 55 },
    'out-delivery': { label: '📦 Out for Delivery', progress: 85 },
    'delivered': { label: '✅ Delivered', progress: 100 },
    'exception': { label: '⚠️ Exception', progress: 40 },
};

// ── App State ────────────────────────────────
let allShipments: Shipment[] = [];

// ── DOM Elements ─────────────────────────────
const loginOverlay = document.getElementById('login-overlay') as HTMLElement;
const loginPass = document.getElementById('admin-pass') as HTMLInputElement;
const loginBtn = document.getElementById('login-btn') as HTMLElement;

const shipmentsBody = document.getElementById('shipments-body') as HTMLElement;
const addBtn = document.getElementById('add-shipment-btn') as HTMLElement;

const modal = document.getElementById('shipment-modal') as HTMLElement;
const form = document.getElementById('shipment-form') as HTMLFormElement;
const cpList = document.getElementById('checkpoints-list') as HTMLElement;

// ── Auth Logic ────────────────────────────────
loginBtn.onclick = () => {
    ADMIN_TOKEN = loginPass.value;
    loadShipments();
};

async function loadShipments() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/shipments`, {
            headers: { 'Authorization': ADMIN_TOKEN }
        });
        if (!res.ok) throw new Error('Invalid Password');

        allShipments = await res.json();
        loginOverlay.classList.add('hidden');
        renderTable();
    } catch (err) {
        alert('Login Failed: ' + (err as Error).message);
    }
}

// ── Table UI ──────────────────────────────────
function renderTable() {
    shipmentsBody.innerHTML = allShipments.map(s => `
    <tr>
      <td style="font-weight:600; color:var(--primary);">${s.trackingNumber}</td>
      <td><span class="status-pill">${s.statusLabel}</span></td>
      <td style="font-size:0.9rem;">${s.meta.origin} → ${s.meta.destination}</td>
      <td>${s.eta}</td>
      <td>
        <button class="btn btn-outline edit-btn" data-id="${s.id}" style="padding:0.3rem 0.6rem; font-size:0.75rem;">Edit</button>
        <button class="btn btn-danger delete-btn" data-id="${s.id}" style="padding:0.3rem 0.6rem; font-size:0.75rem;">Delete</button>
      </td>
    </tr>
  `).join('');

    document.querySelectorAll('.edit-btn').forEach(btn => {
        (btn as HTMLElement).onclick = () => openModal((btn as HTMLElement).dataset.id!);
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        (btn as HTMLElement).onclick = () => deleteShipment((btn as HTMLElement).dataset.id!);
    });
}

// ── Modal & Form Logic ────────────────────────
addBtn.onclick = () => openModal();

document.getElementById('close-modal-btn')!.onclick = () => modal.style.display = 'none';

function openModal(id?: string) {
    const s = allShipments.find(x => x.id === id);
    const title = document.getElementById('modal-title') as HTMLElement;
    title.textContent = s ? 'Edit Shipment' : 'Create New Shipment';

    (document.getElementById('field-id') as HTMLInputElement).value = s?.id || '';
    (document.getElementById('field-num') as HTMLInputElement).value = s?.trackingNumber || '';
    (document.getElementById('field-status') as HTMLSelectElement).value = s?.status || 'processing';
    (document.getElementById('field-origin') as HTMLInputElement).value = s?.meta.origin || '';
    (document.getElementById('field-dest') as HTMLInputElement).value = s?.meta.destination || '';
    (document.getElementById('field-carrier') as HTMLInputElement).value = s?.meta.carrier || 'Trade Center Logistics';
    (document.getElementById('field-eta') as HTMLInputElement).value = s?.eta || '';

    renderCPs(s?.events || []);
    modal.style.display = 'flex';
}

function renderCPs(events: TrackingEvent[]) {
    cpList.innerHTML = events.map((ev, i) => `
    <div class="checkpoint-row">
      <input type="text" class="cp-status" placeholder="Status" value="${ev.status}" />
      <input type="text" class="cp-loc" placeholder="Location" value="${ev.location}" />
      <input type="text" class="cp-time" placeholder="Time/Date" value="${ev.timestamp}" />
      <button type="button" class="btn btn-danger cp-del" data-idx="${i}">×</button>
    </div>
  `).join('');

    document.querySelectorAll('.cp-del').forEach(btn => {
        (btn as HTMLElement).onclick = () => {
            events.splice(parseInt((btn as HTMLElement).dataset.idx!), 1);
            renderCPs(events);
        };
    });
}

document.getElementById('add-cp-btn')!.onclick = () => {
    const rows = document.querySelectorAll('.checkpoint-row');
    const currentCPs: TrackingEvent[] = Array.from(rows).map(row => ({
        status: (row.querySelector('.cp-status') as HTMLInputElement).value,
        location: (row.querySelector('.cp-loc') as HTMLInputElement).value,
        timestamp: (row.querySelector('.cp-time') as HTMLInputElement).value,
        done: true,
        active: false
    }));
    currentCPs.unshift({ status: 'Updated Location', location: 'City, Country', timestamp: new Date().toLocaleString(), done: false, active: true });
    renderCPs(currentCPs);
};

form.onsubmit = async (e) => {
    e.preventDefault();
    const id = (document.getElementById('field-id') as HTMLInputElement).value;
    const status = (document.getElementById('field-status') as HTMLSelectElement).value;

    const cpRows = document.querySelectorAll('.checkpoint-row');
    const events: TrackingEvent[] = Array.from(cpRows).map((row, i) => ({
        status: (row.querySelector('.cp-status') as HTMLInputElement).value,
        location: (row.querySelector('.cp-loc') as HTMLInputElement).value,
        timestamp: (row.querySelector('.cp-time') as HTMLInputElement).value,
        done: i > 0,
        active: i === 0
    }));

    const payload: Partial<Shipment> = {
        id: id || undefined,
        trackingNumber: (document.getElementById('field-num') as HTMLInputElement).value,
        status: status,
        statusLabel: STATUS_CONFIG[status].label,
        progressPercent: STATUS_CONFIG[status].progress,
        eta: (document.getElementById('field-eta') as HTMLInputElement).value,
        meta: {
            origin: (document.getElementById('field-origin') as HTMLInputElement).value,
            destination: (document.getElementById('field-dest') as HTMLInputElement).value,
            carrier: (document.getElementById('field-carrier') as HTMLInputElement).value,
            weight: '—',
            service: 'Standard Cargo'
        },
        events
    };

    const res = await fetch(`${API_BASE}/api/admin/shipments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': ADMIN_TOKEN
        },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        modal.style.display = 'none';
        loadShipments();
    }
};

async function deleteShipment(id: string) {
    if (!confirm('Are you sure you want to delete this shipment?')) return;
    const res = await fetch(`${API_BASE}/api/admin/shipments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': ADMIN_TOKEN }
    });
    if (res.ok) loadShipments();
}
