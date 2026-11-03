// Worker entry: /api/* runs here, everything else is served from static assets.
import { onRequestPost as contact } from './contact.js';
import { onRequestPost as chat } from './chat.js';
import { json } from './lead.js';

const ROUTES = { '/api/contact': contact, '/api/chat': chat };

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    const handler = ROUTES[pathname];
    if (handler) {
      if (request.method !== 'POST') return json({ error: 'method' }, 405);
      return handler({ request, env, ctx });
    }
    return env.ASSETS.fetch(request);
  },
};
