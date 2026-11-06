import { deliverLead, clean, isEmail, json, sameOrigin, attribution } from './lead.js';

// Site assistant. Needs ANTHROPIC_API_KEY as a secret on the wpmedia Worker.
// Optional: AGENT_MODEL (default claude-haiku-5-5).
// Knowledge below is the single source of truth for the assistant — keep it in sync with the site.

const KNOWLEDGE = `
ABOUT
Waterproofmedia is a growth studio in Amsterdam, led by Pieter Vijgeboom (10+ years as a digital marketing strategist). Small core team: Pieter (strategy, marketing) and Ilja (content, communication), extended with a freelance network for animation and design, visuals, web design, green marketing, 3D/VR and TikTok. Clients work directly with senior people, no account managers in between.
Positioning: "Good ideas deserve results." (NL: "Goede ideeën verdienen resultaat.") Creativity combined with data: we think up, build, test and improve, for clients and for our own products. The studio uses the same approach for its own products as for clients.

SERVICES (five capabilities)
1. Campaigns: social and paid campaigns on Meta, TikTok and LinkedIn, run as growth experiments with daily monitoring and budget shifts.
2. CRO: conversion optimisation, experimentation, customer journeys and landing pages.
3. Content: content strategy, copywriting, storytelling, brand positioning and SEO.
4. Automation & AI: workflows that remove repetitive marketing and sales work, AI-assisted research and content.
5. Dashboards: one view from reach and content to leads, customers and revenue.

OFFER (how to start)
- Growth Scan: free, self-service analysis of a website at /en/growth-scan/. Shows opportunities in brand, content, search and conversion.
- Quick wins: fixed scope, price agreed upfront. Examples: CRO audit, campaign setup, dashboard setup.
- Growth Sprint: a short sprint of 2 to 6 weeks on one clear challenge, with measurable results and concrete lessons for the next step.
- Growth Program: ongoing collaboration on campaigns, conversion, automation and insight into results, with one fixed point of contact.
- Campaign work can be done on agreed hours, invoiced via a prepaid hour card (strippenkaart). The client can stop at any time.
PRICES: never give amounts, rates or estimates. Say that scope and price are agreed upfront after a short intro call, and that the Growth Scan is free.

PROOF (only use these facts)
- BooyaKa Festival (Amsterdam, Nov 2026): six days of paid delivery, €422.87 total media, 159,132 impressions, 66 registrations, 54 people in the room, €7.83 media cost per attendee. Case: /nl/cases/booyaka/ (Dutch) or /en/cases/booyaka/ (English); all cases: /nl/cases/ or /en/cases/. Campaign page: /nl/campagnes/ or /en/campaigns/
- nlgroeit: 2× reach and conversion in 18 months.
- ITYM: 640 Dutch organisations screened; research turned into positioning, content and campaigns for a complex B2B cybersecurity proposition.
- Other clients: KVK (CRO and experimentation), Nyenrode (content and SEO), Interpolis (customer journeys), I amsterdam (content and platform growth), Ziggo, Delta Fiber.
- Testimonial from Michiel, Youlynq.me: the team brings inspiration and gets things done.

LAB (own products)
- Growth Dashboard: funnel dashboard from reach to revenue. Demo: /en/growth-dashboard/
- Walhalla Jobs: helps freelancers, interim professionals and experienced people find and win assignments and jobs. In private beta. Site: https://walhallajobs.com

CONTACT
- Contact form: /nl/contact/ (Dutch) or /en/contact/ (English). Usually a reply within one working day.
- Book an intro call directly: https://calendar.app.google/ik7M5hQBU9G499wD6
- Email: info@waterproofmedia.com
`;

const SYSTEM = (lang) => `You are the website assistant of Waterproofmedia. You are an AI, never pretend to be human.
Answer in ${lang === 'en' ? 'English' : 'Dutch (informal "je", clear B1 level)'} unless the visitor writes in another language; then follow the visitor.

GOAL: help visitors quickly understand whether Waterproofmedia fits their need, and guide good fits to a conversation.

RULES
- Use ONLY the knowledge below. If something is not in it, say you don't know and offer contact. Never invent numbers, clients, prices, timelines or guarantees.
- Keep answers short: max 90 words, plain text, no markdown headings, at most 3 short bullet lines.
- Ask at most one question per reply. Useful questions: goal, channel or service, timing, whether there is a media budget.
- When the visitor wants contact, offer two routes: book a call (calendar link) or leave details here.
- If the visitor gives their name and email AND agrees to be contacted, call save_lead once with a short summary. Then confirm that Pieter or the team will reply within one working day, and share the calendar link for those who want to plan right away.
- Do not ask for sensitive personal data. Do not discuss competitors negatively. Politely decline off-topic requests in one sentence.
- Link with the exact paths from the knowledge, matching the visitor's language where a /nl/ or /en/ version exists.

KNOWLEDGE
${KNOWLEDGE}`;

const TOOLS = [{
  name: 'save_lead',
  description: 'Send a qualified contact request to the Waterproofmedia team. Only call after the visitor gave name and email and agreed to be contacted.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string' },
      company: { type: 'string' },
      need: { type: 'string', description: 'What they want help with, in one or two sentences' },
      timing: { type: 'string' },
      consent: { type: 'boolean', description: 'Visitor explicitly agreed to be contacted' },
    },
    required: ['name', 'email', 'need', 'consent'],
  },
}];

// Best-effort per-isolate limiter. Bind a KV namespace as RATE for a global limit.
const hits = new Map();
async function limited(env, ip) {
  const bucket = `${ip}:${Math.floor(Date.now() / 600000)}`; // 10-minute window
  if (env.RATE) {
    const n = parseInt((await env.RATE.get(bucket)) || '0', 10) + 1;
    await env.RATE.put(bucket, String(n), { expirationTtl: 900 });
    return n > 30;
  }
  const n = (hits.get(bucket) || 0) + 1;
  hits.set(bucket, n);
  if (hits.size > 5000) hits.clear();
  return n > 30;
}

async function callClaude(env, body) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}`);
  return r.json();
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'origin' }, 403);
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'not_configured' }, 503);

  const ip = request.headers.get('CF-Connecting-IP') || 'anon';
  if (await limited(env, ip)) return json({ error: 'rate_limited' }, 429);

  let d;
  try { d = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const lang = d.lang === 'en' ? 'en' : 'nl';

  const messages = (Array.isArray(d.messages) ? d.messages : [])
    .slice(-12)
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: clean(m.content, 1200) }))
    .filter((m) => m.content);
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== 'user') return json({ error: 'invalid' }, 422);

  const base = { model: env.AGENT_MODEL || 'claude-haiku-5-5', max_tokens: 450, system: SYSTEM(lang), tools: TOOLS };

  try {
    let res = await callClaude(env, { ...base, messages });
    let lead = false;

    const call = res.stop_reason === 'tool_use' && res.content.find((c) => c.type === 'tool_use' && c.name === 'save_lead');
    if (call) {
      let result = 'Not saved: missing name, valid email or consent.';
      {
        const i = call.input || {};
        const email = clean(i.email, 200).toLowerCase();
        if (i.consent === true && clean(i.name) && isEmail(email)) {
          const transcript = messages.map((m) => `${m.role === 'user' ? 'Visitor' : 'Assistant'}: ${m.content}`).join('\n');
          lead = await deliverLead(env, {
            source: 'assistant', name: clean(i.name, 120), email, company: clean(i.company, 160),
            topic: '', timing: clean(i.timing, 120), message: clean(i.need, 1000), lang,
            page: clean(d.page, 200), consent: true, country: request.cf?.country || '',
            transcript: transcript.slice(-6000),
            ...attribution(d.attribution),
          });
          result = lead ? 'Saved. The team will reply within one working day.' : 'Saving failed. Ask the visitor to email info@waterproofmedia.com or book via the calendar link.';
        }
      }
      res = await callClaude(env, {
        ...base,
        messages: [...messages, { role: 'assistant', content: res.content },
          { role: 'user', content: [{ type: 'tool_result', tool_use_id: call.id, content: result }] }],
      });
    }

    const reply = (res.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
    return json({ reply: reply || (lang === 'en' ? 'Could you rephrase that?' : 'Kun je dat anders formuleren?'), lead });
  } catch (e) {
    return json({ error: 'upstream' }, 502);
  }
}
