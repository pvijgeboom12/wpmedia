# waterproofmedia.com

Statische site op een Cloudflare Worker (project `wpmedia`, config in `wrangler.jsonc`). De hele repo is de asset-root; `.assetsignore` houdt config en docs privé. Elke push naar `main` deployt naar https://wpmedia.pieter-75f.workers.dev. Andere branches krijgen een preview-URL in de vorm `<branch>-wpmedia.pieter-75f.workers.dev`. Er is geen build-stap.

## Werkafspraken met Pieter

- Nieuwe of gewijzigde teksten eerst aan Pieter voorleggen, op een branch met preview-URL. Pas na zijn akkoord mergen naar `main`.
- Publiceren, live zetten en de DNS-wissel alleen na expliciet akkoord.
- Inloggen (GitHub, Cloudflare, Google) doet Pieter altijd zelf.
- Geen verzonnen cijfers. Proof komt alleen uit bestaande cases en echte data.
- Werktaal met Pieter is Nederlands. Alles rond BooyaKa, Akshay of Black Puma is Engels.

## Structuur

```
/nl/   hoofdtaal: homepage, /nl/contact/, /nl/campagnes/, /nl/cases/
/en/   Engels: homepage, /en/contact/, /en/cases/, /en/cases/booyaka/ (nieuw design) en de gemigreerde pagina's (growth-scan, growth-dashboard, disclaimer)
/de/   Duits  — pas na akkoord op NL en EN
/es/   Spaans — pas na akkoord op NL en EN
/assets/css/site.css   gedeeld design system (nieuwe pagina's)
/assets/js/site.js     nav, reveal, contactformulier, AI-assistent
/assets/img/      alle afbeeldingen (oude WordPress-uploads, platte map)
/worker/index.js     Worker-entry: /api/* hier, de rest uit static assets
/worker/contact.js   contactformulier → lead
/worker/chat.js      AI-assistent (Claude API), kennisblok staat bovenin
/worker/lead.js      gedeelde lead-aflevering (webhook, e-mail, KV)
_redirects        301's van oude WordPress-URL's + tijdelijke root-redirect
_headers          security headers, cache, noindex op workers.dev
sitemap.xml       handmatig bijhouden bij elke nieuwe pagina
```

Elke pagina is één `index.html` in een eigen map, zodat de URL eindigt op `/`.

## Regels voor elke pagina

1. Eigen `<title>` en meta description. Bij gemigreerde pagina's één op één uit Yoast.
2. `<link rel="canonical">` naar de absolute URL op waterproofmedia.com.
3. Hreflang-links naar alle bestaande taalversies plus `x-default` naar NL, zodra een tweede taal van die pagina bestaat. Geen automatische taal-redirect.
4. Analytics-snippet `GT-TXZ6TW6` met consent mode, zoals in de bestaande pagina's.
5. Alle tekst staat direct in de HTML. Animaties mogen tekst nooit verbergen voor crawlers of zonder JavaScript (de oude proof-sectie bleef leeg in een headless browser).
6. Contrast minimaal WCAG AA.
7. Pagina toevoegen aan `sitemap.xml`.

## Contactflow en assistent

Beide sturen leads via `worker/lead.js`. Instellen in Cloudflare → Workers & Pages → wpmedia → Settings → Variables and Secrets. KV-bindings (`LEADS`, `RATE`) gaan in `wrangler.jsonc`.

- `LEAD_WEBHOOK_URL`: Make-webhook die de lead doorzet naar Gmail, Sheet of HubSpot. Minimaal één kanaal is nodig, anders toont het formulier de mail-fallback.
- `RESEND_API_KEY` + `LEAD_EMAIL_TO` (+ `LEAD_EMAIL_FROM` op een geverifieerd domein): optioneel, directe e-mail.
- `LEADS`: optionele KV-binding met een kopie van elke lead.
- `ANTHROPIC_API_KEY` (secret): zet de assistent aan. `AGENT_MODEL` optioneel, standaard `claude-haiku-5-5`.
- `RATE`: optionele KV-binding voor een globale rate limit op de assistent (30 berichten per IP per 10 min).

Feiten in de assistent staan in het `KNOWLEDGE`-blok in `worker/chat.js`. Houd dat gelijk met de site. Geen prijzen.

## Integraties

- Growth Scan-backend: https://growth-scan-tool.vercel.app (`/api/analyse`, `/api/retrieve`, `/api/lead`). Los van deze site.
- Agenda: https://calendar.app.google/ik7M5hQBU9G499wD6
- Contact: info@waterproofmedia.com

## Status (3 november 2026)

- [x] WordPress-pagina's 1-op-1 gemigreerd naar `/en/` (home, growth-scan, growth-dashboard, disclaimer, cases/booyaka)
- [x] Redirects, headers, sitemap, 404
- [x] Herorichting: "We bouwen groei. Voor klanten, en voor onszelf."
- [x] NL/EN-homepage, contactpagina's, AI-assistent (branch `redesign-home`, ter goedkeuring)
- [ ] Lab-pagina's, Growth Scan en Dashboard in NL, campagnepagina in het nieuwe systeem
- [ ] Ascendly bewust nog niet op de site
- [ ] DE en ES na akkoord
- [ ] DNS-wissel, Search Console, WordPress read-only op subdomein
