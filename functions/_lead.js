// Shared lead delivery for /api/contact and /api/chat.
// Configure at least one channel in Cloudflare Pages → Settings → Variables and Secrets:
//   LEAD_WEBHOOK_URL  e.g. a Make.com custom webhook (→ Gmail, Sheet, HubSpot…)
//   RESEND_API_KEY + LEAD_EMAIL_TO (+ LEAD_EMAIL_FROM on a verified domain)
//   LEADS             optional KV namespace binding, keeps a copy of every lead
// Returns true when at least one channel accepted the lead.

export async function deliverLead(env, lead) {
  const record = { ...lead, received_at: new Date().toISOString() };
  const results = [];

  if (env.LEAD_WEBHOOK_URL) {
    results.push(
      fetch(env.LEAD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      }).then((r) => r.ok).catch(() => false)
    );
  }

  if (env.RESEND_API_KEY && env.LEAD_EMAIL_TO) {
    const lines = Object.entries(record)
      .filter(([, v]) => v !== '' && v != null)
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
    results.push(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.LEAD_EMAIL_FROM || 'Waterproofmedia site <site@waterproofmedia.com>',
          to: env.LEAD_EMAIL_TO.split(',').map((s) => s.trim()),
          reply_to: record.email || undefined,
          subject: `Nieuwe aanvraag (${record.source}): ${record.topic || 'algemeen'} — ${record.name || record.email}`,
          text: lines.join('\n'),
        }),
      }).then((r) => r.ok).catch(() => false)
    );
  }

  if (env.LEADS) {
    const key = `${record.received_at}_${Math.random().toString(36).slice(2, 8)}`;
    results.push(env.LEADS.put(key, JSON.stringify(record)).then(() => true).catch(() => false));
  }

  const ok = (await Promise.all(results)).some(Boolean);
  return ok;
}

export function clean(v, max = 2000) {
  return typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, (c) => (c === '\n' ? '\n' : ' ')).trim().slice(0, max) : '';
}

export const isEmail = (s) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(s);

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

// Only accept browser posts from our own site (plus Pages previews and local dev).
export function sameOrigin(request) {
  const o = request.headers.get('Origin');
  if (!o) return false;
  try {
    const h = new URL(o).hostname;
    return h === 'waterproofmedia.com' || h === 'www.waterproofmedia.com' || h.endsWith('.pages.dev') || h === 'localhost' || h === '127.0.0.1';
  } catch { return false; }
}
