import './style.css';

// ── Config ──────────────────────────────────────────────────────────────────
// In dev, calls go to the Express server at :3001.
// In production, set VITE_API_URL to your deployed backend URL.
const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

// ── Types ──────────────────────────────────────────────────────────────────

interface TrackingEvent {
  status: string;
  location: string;
  timestamp: string;
  done: boolean;
  active: boolean;
}

interface TrackingResult {
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

// ── API call ────────────────────────────────────────────────────────────────

async function fetchTracking(trackingNumber: string): Promise<TrackingResult> {
  const response = await fetch(`${API_BASE}/api/track/${encodeURIComponent(trackingNumber)}`);
  const body = await response.json() as { success?: boolean; data?: TrackingResult; error?: string };

  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error ?? `Server error (${response.status})`);
  }

  return body.data;
}

// ── Renderer ────────────────────────────────────────────────────────────────

function renderResult(result: TrackingResult): string {
  const statusClass: Record<TrackingResult['status'], string> = {
    'in-transit': 'status-in-transit',
    'delivered': 'status-delivered',
    'out-delivery': 'status-out-delivery',
    'processing': 'status-processing',
    'exception': 'status-exception',
  };

  const timelineHTML = result.events.map(ev => `
    <div class="timeline-event ${ev.done ? 'done' : ''} ${ev.active ? 'active' : ''}">
      <div class="timeline-connector">
        <div class="timeline-dot"></div>
        <div class="timeline-line"></div>
      </div>
      <div class="timeline-body">
        <div class="timeline-event-label">${ev.status}</div>
        <div class="timeline-event-location">📍 ${ev.location}</div>
        <div class="timeline-event-time">🕐 ${ev.timestamp}</div>
      </div>
    </div>
  `).join('');

  return `
    <div class="result-header">
      <div>
        <div class="result-tracking-num">Tracking Number</div>
        <div class="result-title">${result.trackingNumber}</div>
      </div>
      <span class="status-badge ${statusClass[result.status]}">${result.statusLabel}</span>
    </div>

    <div class="result-meta">
      <div class="meta-item">
        <div class="meta-label">Origin</div>
        <div class="meta-value">${result.meta.origin}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Destination</div>
        <div class="meta-value">${result.meta.destination}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Carrier</div>
        <div class="meta-value">${result.meta.carrier}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Service</div>
        <div class="meta-value">${result.meta.service}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Weight</div>
        <div class="meta-value">${result.meta.weight}</div>
      </div>
    </div>

    <div class="eta-bar">
      <div>
        <div class="eta-bar-label">Estimated Delivery</div>
        <div class="eta-bar-value">${result.eta}</div>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width: ${result.progressPercent}%"></div>
      </div>
    </div>

    <div class="timeline-wrap">
      <div class="timeline-title">Shipment History</div>
      <div class="timeline">${timelineHTML || '<p style="color:var(--text-muted);font-size:.9rem;">No checkpoint events yet. Check back shortly.</p>'}</div>
    </div>
  `;
}

// ── App ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('tracking-form') as HTMLFormElement;
  const input = document.getElementById('tracking-input') as HTMLInputElement;
  const trackBtn = document.getElementById('track-btn') as HTMLButtonElement;
  const btnText = trackBtn.querySelector<HTMLSpanElement>('.btn-text')!;
  const btnSpinner = trackBtn.querySelector<HTMLSpanElement>('.btn-spinner')!;
  const resultSection = document.getElementById('result-section') as HTMLElement;
  const resultCard = document.getElementById('result-card') as HTMLElement;

  // Sample quick-fill links
  document.querySelectorAll<HTMLButtonElement>('.sample-link').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.num ?? '';
      form.dispatchEvent(new Event('submit'));
    });
  });

  // Track form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const trackingNumber = input.value.trim().toUpperCase();
    if (!trackingNumber) return;

    // Loading state
    btnText.textContent = 'Tracking…';
    btnSpinner.classList.remove('hidden');
    trackBtn.disabled = true;
    resultSection.classList.add('hidden');

    try {
      const result = await fetchTracking(trackingNumber);
      resultCard.innerHTML = renderResult(result);
      resultSection.classList.remove('hidden');
      setTimeout(() => {
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not retrieve tracking data.';
      resultCard.innerHTML = `
        <div style="padding:2.5rem;text-align:center;">
          <div style="font-size:2rem;margin-bottom:1rem;">⚠️</div>
          <h3 style="margin-bottom:.5rem;color:var(--primary);">Tracking Error</h3>
          <p style="color:var(--text-muted);max-width:420px;margin:0 auto;">${msg}</p>
        </div>`;
      resultSection.classList.remove('hidden');
    } finally {
      btnText.textContent = 'Track Now';
      btnSpinner.classList.add('hidden');
      trackBtn.disabled = false;
    }
  });

  // Mobile menu
  const mobileBtn = document.getElementById('mobile-menu-btn') as HTMLButtonElement;
  const navLinks = document.getElementById('nav-links') as HTMLUListElement;
  mobileBtn.addEventListener('click', () => navLinks.classList.toggle('open'));
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => navLinks.classList.remove('open'));
  });

  // Sticky header shadow on scroll
  const header = document.getElementById('header') as HTMLElement;
  window.addEventListener('scroll', () => {
    header.style.boxShadow = window.scrollY > 10
      ? '0 2px 16px rgba(0,0,0,.12)'
      : '';
  }, { passive: true });
});
