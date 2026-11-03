# waterproofmedia.com

Statische site op Cloudflare Pages. Elke push naar `main` deployt automatisch. Elke andere branch krijgt een eigen preview-URL op `*.pages.dev`. Er is geen build-stap: wat in de repo staat, is wat live staat.

## Werkafspraken met Pieter

- Nieuwe of gewijzigde teksten eerst aan Pieter voorleggen, op een branch met preview-URL. Pas na zijn akkoord mergen naar `main`.
- Publiceren, live zetten en de DNS-wissel alleen na expliciet akkoord.
- Inloggen (GitHub, Cloudflare, Google) doet Pieter altijd zelf.
- Geen verzonnen cijfers. Proof komt alleen uit bestaande cases en echte data.
- Werktaal met Pieter is Nederlands. Alles rond BooyaKa, Akshay of Black Puma is Engels.

## Structuur

```
/nl/   hoofdtaal (nog te bouwen)
/en/   Engels — bevat nu de gemigreerde WordPress-pagina's
/de/   Duits  — pas na akkoord op NL en EN
/es/   Spaans — pas na akkoord op NL en EN
/assets/img/      alle afbeeldingen (oude WordPress-uploads, platte map)
_redirects        301's van oude WordPress-URL's + tijdelijke root-redirect
_headers          security headers, cache, noindex op *.pages.dev
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

## Integraties

- Growth Scan-backend: https://growth-scan-tool.vercel.app (`/api/analyse`, `/api/retrieve`, `/api/lead`). Los van deze site.
- Agenda: https://calendar.app.google/ik7M5hQBU9G499wD6
- Contact: info@waterproofmedia.com

## Status (3 november 2026)

- [x] WordPress-pagina's 1-op-1 gemigreerd naar `/en/` (home, growth-scan, growth-dashboard, disclaimer, cases/booyaka)
- [x] Redirects, headers, sitemap, 404
- [ ] Herorichting kiezen (Pieter)
- [ ] NL- en EN-homepage herschrijven volgens de overdracht, ter goedkeuring
- [ ] Campagnes-pagina (`/nl/campagnes/`) in het nieuwe systeem
- [ ] Root-redirect omzetten naar `/ /nl/ 301` zodra NL bestaat
- [ ] DE en ES na akkoord
- [ ] DNS-wissel, Search Console, WordPress read-only op subdomein
