// Live AI-factchecker on /nl/factchecker/.
//
// Flow: page → POST /api/factcheck (Turnstile + limits) → Make webhook (scenario 8572631)
//       Make → POST /api/factcheck/callback (per round or at the end) → KV
//       page polls GET /api/factcheck?id=… until status is "done" or "error".
//
// Settings (Cloudflare → Workers & Pages → wpmedia → Settings → Variables and Secrets):
//   FACTCHECK_WEBHOOK_URL     Make custom webhook. Empty = demo mode: the page only shows the process.
//   FACTCHECK_CALLBACK_TOKEN  secret Make sends back in X-Factcheck-Token.
//   TURNSTILE_SECRET          Turnstile secret key. Required when the webhook is set.
//   FACTCHECK                 KV binding (wrangler.jsonc) for jobs and limits. Required when the webhook is set.
//   FACTCHECK_PER_IP_DAY      optional, default 3.   FACTCHECK_SITE_DAY  optional, default 30.
// Every run costs OpenRouter credit, so nothing runs without all four required settings.

import { clean, isEmail, json, sameOrigin, deliverLead, attribution } from './lead.js';

const TTL = 7 * 24 * 3600;
const day = () => new Date().toISOString().slice(0, 10);

function live(env) {
  return !!(env.FACTCHECK_WEBHOOK_URL && env.FACTCHECK_CALLBACK_TOKEN && env.TURNSTILE_SECRET && env.FACTCHECK);
}

async function turnstileOk(env, token, ip) {
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const j = await r.json();
    return j.success === true;
  } catch { return false; }
}

async function bump(env, key, max) {
  const n = parseInt((await env.FACTCHECK.get(key)) || '0', 10);
  if (n >= max) return false;
  await env.FACTCHECK.put(key, String(n + 1), { expirationTtl: 2 * 24 * 3600 });
  return true;
}

async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].slice(0, 12).map((x) => x.toString(16).padStart(2, '0')).join('');
}

function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// POST /api/factcheck
export async function start({ request, env, ctx }) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'origin' }, 403);
  let d;
  try { d = await request.json(); } catch { return json({ ok: false, error: 'bad_json' }, 400); }
  if (clean(d.fax)) return json({ ok: true, demo: true });

  const vraag = clean(d.vraag, 1200);
  const bronnen = clean(d.bronnen, 600);
  const email = clean(d.email, 200).toLowerCase();
  const lang = d.lang === 'en' ? 'en' : 'nl';
  if (vraag.length < 12) return json({ ok: false, error: 'too_short' }, 422);
  if (email && !isEmail(email)) return json({ ok: false, error: 'email' }, 422);

  if (!live(env)) return json({ ok: true, demo: true, missing: ['FACTCHECK_WEBHOOK_URL', 'FACTCHECK_CALLBACK_TOKEN', 'TURNSTILE_SECRET', 'FACTCHECK'].filter((k) => !env[k]) });

  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (!(await turnstileOk(env, d.token, ip))) return json({ ok: false, error: 'turnstile' }, 403);

  const ipKey = `lim:ip:${await sha(ip + day())}`;
  if (!(await bump(env, ipKey, parseInt(env.FACTCHECK_PER_IP_DAY || '10', 10)))) return json({ ok: false, error: 'limit_ip' }, 429);
  if (!(await bump(env, `lim:site:${day()}`, parseInt(env.FACTCHECK_SITE_DAY || '30', 10)))) return json({ ok: false, error: 'limit_site' }, 429);

  const id = crypto.randomUUID();
  const job = { id, status: 'queued', vraag, created: new Date().toISOString() };
  await env.FACTCHECK.put(`job:${id}`, JSON.stringify(job), { expirationTtl: TTL });

  const origin = new URL(request.url).origin;
  const sent = await fetch(env.FACTCHECK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: id, vraag, bronnen, lang, callback_url: `${origin}/api/factcheck/callback`, callback_token: env.FACTCHECK_CALLBACK_TOKEN }),
  }).then((r) => r.ok).catch(() => false);
  if (!sent) {
    await env.FACTCHECK.put(`job:${id}`, JSON.stringify({ ...job, status: 'error' }), { expirationTtl: TTL });
    return json({ ok: false, error: 'delivery' }, 502);
  }

  // Optional: visitor wants the report by mail. That makes it a lead.
  if (email && d.consent) {
    ctx.waitUntil(deliverLead(env, {
      source: 'factcheck_tool', topic: 'factcheck', email, name: clean(d.name, 120), message: vraag,
      job_id: id, lang, page: clean(d.page, 200), consent: true, country: request.cf?.country || '', ...attribution(d.attribution),
    }));
  }
  return json({ ok: true, id });
}

// GET /api/factcheck?id=…
export async function status({ request, env }) {
  if (!env.FACTCHECK) return json({ ok: false, error: 'off' }, 404);
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^[0-9a-f-]{36}$/.test(id)) return json({ ok: false, error: 'id' }, 400);
  const raw = await env.FACTCHECK.get(`job:${id}`);
  if (!raw) return json({ ok: false, error: 'not_found' }, 404);
  const job = JSON.parse(raw);
  // Make sends no error callback: no result within 6 minutes counts as failed.
  if (!['done', 'error'].includes(job.status) && Date.now() - Date.parse(job.created) > 6 * 60 * 1000) job.status = 'error';
  return json({ ok: true, job });
}

// Make passes AI output as strings; take the first {...} block and parse it.
function parseJson(v) {
  if (v && typeof v === 'object') return v;
  if (typeof v !== 'string' || v.indexOf('{') < 0) return undefined;
  const m = v.slice(v.indexOf('{'));
  try { return JSON.parse(m.slice(0, m.lastIndexOf('}') + 1)); } catch { return undefined; }
}

// Referee (only when the panel disagreed): its decision wins for that claim.
function merge(res, ref) {
  if (!res || typeof res !== 'object') return undefined;
  if (!ref || !Array.isArray(ref.beslissingen) || !Array.isArray(res.claims)) return res;
  const norm = (x) => String(x || '').toLowerCase().replace(/\s+/g, ' ').trim();
  for (const b of ref.beslissingen) {
    const c = res.claims.find((k) => norm(k.claim) === norm(b.claim)) || res.claims.find((k) => norm(k.claim).includes(norm(b.claim).slice(0, 40)));
    if (!c) continue;
    if (b.oordeel) c.oordeel = b.oordeel;
    c.doorslag = { bron: Array.isArray(b.bronnen) ? b.bronnen[0] : '', toelichting: b.toelichting || '', niveau: b.niveau };
  }
  if (ref.zekerheid) res.zekerheid = ref.zekerheid;
  res.scheidsrechter = true;
  return res;
}

// POST /api/factcheck/callback (from Make)
const ROUND = (o) => (o && typeof o === 'object' ? { claude: clean(o.claude, 6000), gpt: clean(o.gpt, 6000), gemini: clean(o.gemini, 6000) } : undefined);
export async function callback({ request, env }) {
  if (!env.FACTCHECK || !env.FACTCHECK_CALLBACK_TOKEN) return json({ ok: false }, 404);
  if (!same(request.headers.get('X-Factcheck-Token') || '', env.FACTCHECK_CALLBACK_TOKEN)) return json({ ok: false }, 401);
  let d;
  try { d = await request.json(); } catch { return json({ ok: false, error: 'bad_json' }, 400); }
  const id = clean(d.job_id, 40);
  const raw = await env.FACTCHECK.get(`job:${id}`);
  if (!raw) return json({ ok: false, error: 'not_found' }, 404);
  const job = JSON.parse(raw);
  const st = ['ronde1', 'ronde2', 'done', 'error'].includes(d.status) ? d.status : 'done';
  const resultaat = merge(parseJson(d.resultaat_json ?? d.resultaat), parseJson(d.scheidsrechter));
  const next = {
    ...job, status: st, updated: new Date().toISOString(),
    ronde1: ROUND(d.ronde1) || job.ronde1, ronde2: ROUND(d.ronde2) || job.ronde2,
    samenvatting: d.samenvatting ? clean(d.samenvatting, 4000) : job.samenvatting,
    beslisser: d.scheidsrechter ? clean(d.scheidsrechter, 6000) : job.beslisser,
    resultaat: resultaat && typeof resultaat === 'object' ? resultaat : job.resultaat,
  };
  await env.FACTCHECK.put(`job:${id}`, JSON.stringify(next), { expirationTtl: TTL });
  return json({ ok: true });
}
