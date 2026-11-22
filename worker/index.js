// Worker entry: /api/* runs here, everything else is served from static assets.
import { onRequestPost as contact } from './contact.js';
import { onRequestPost as chat } from './chat.js';
import { start as factcheckStart, status as factcheckStatus, callback as factcheckCallback } from './factcheck.js';
import { json } from './lead.js';

const ROUTES = {
  'POST /api/contact': contact,
  'POST /api/chat': chat,
  'POST /api/factcheck': factcheckStart,
  'GET /api/factcheck': factcheckStatus,
  'POST /api/factcheck/callback': factcheckCallback,
};

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    const handler = ROUTES[`${request.method} ${pathname}`];
    if (handler) return handler({ request, env, ctx });
    if (pathname.startsWith('/api/')) return json({ error: 'method' }, 405);
    return env.ASSETS.fetch(request);
  },
};
