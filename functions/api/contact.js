import { deliverLead, clean, isEmail, json, sameOrigin } from '../_lead.js';

const TOPICS = ['campagne', 'cro', 'content', 'automation', 'dashboard', 'growth-scan', 'anders'];
const TIMING = ['asap', 'month', 'quarter', 'exploring'];

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'origin' }, 403);

  let d;
  try { d = await request.json(); } catch { return json({ ok: false, error: 'bad_json' }, 400); }

  // Honeypot: real people never fill this field.
  if (clean(d.fax)) return json({ ok: true });

  const lead = {
    source: 'contact_form',
    name: clean(d.name, 120),
    email: clean(d.email, 200).toLowerCase(),
    company: clean(d.company, 160),
    website: clean(d.website, 300),
    phone: clean(d.phone, 40),
    topic: TOPICS.includes(d.topic) ? d.topic : '',
    timing: TIMING.includes(d.timing) ? d.timing : '',
    message: clean(d.message, 3000),
    lang: d.lang === 'en' ? 'en' : 'nl',
    page: clean(d.page, 200),
    consent: d.consent === 'on' || d.consent === true,
    country: request.cf?.country || '',
  };

  if (!lead.name || !isEmail(lead.email) || !lead.message) return json({ ok: false, error: 'invalid' }, 422);
  if (!lead.consent) return json({ ok: false, error: 'consent' }, 422);

  const ok = await deliverLead(env, lead);
  return ok ? json({ ok: true }) : json({ ok: false, error: 'delivery' }, 502);
}
