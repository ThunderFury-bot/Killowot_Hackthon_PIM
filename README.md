# Catalog Desk: AI-Powered PIM for WooCommerce

A Product Information Management system that turns raw product notes into WooCommerce-ready listings using Google Gemini (`gemini-2.5-flash`), then pushes them to a store through the WooCommerce REST API.

**Stack:** React (Vite) + Tailwind CSS + Lucide · Node.js + Express · Gemini API · `@woocommerce/woocommerce-rest-api` · Jest + Supertest

## Quick start (zero config)

```bash
npm install && npm --prefix client install
npm run dev          # API on :4000, dashboard on http://localhost:5173
npm test             # backend unit + API integration tests
```

The app runs with no credentials. Without keys it uses **fallback mode**:

| Integration | No credentials | With credentials |
|---|---|---|
| Gemini | Deterministic heuristic that parses the notes | Real `gemini-2.5-flash` call, JSON output |
| WooCommerce | Simulated store (returns an ID and HTTP 201/200) | Real calls to `/wp-json/wc/v3/products` |

The navbar shows which mode is active (green dot = live, amber = fallback/mock).

To go live, copy `.env.example` to `.env` and set `GEMINI_API_KEY`, `WC_URL`, `WC_CONSUMER_KEY` and `WC_CONSUMER_SECRET` (create the keys under WooCommerce → Settings → Advanced → REST API, with read/write access).

### Demonstrating a sync failure
In mock mode any SKU starting with `FAIL-` is rejected by the simulated store. Add a product with SKU `FAIL-001`, enrich it, and sync it: the log records the HTTP 400, the error trace, and the dashboard counts a sync failure.

## Production build

```bash
npm run build && npm start     # Express serves client/dist on :4000
```

## Packaging

`./setup-and-zip.sh` installs dependencies and writes `pim-woocommerce-system.zip` (excluding `node_modules`, `dist` and `.git`).

## REST API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/products?status=&q=` | List, filter and search |
| GET | `/api/products/metrics` | Dashboard counters |
| POST | `/api/products` | Create (validated; SKU unique) |
| GET / PUT / DELETE | `/api/products/:id` | Read, update, delete |
| POST | `/api/products/:id/enrich` | Enrich one product with Gemini |
| POST | `/api/products/enrich-bulk` | Enrich the given `ids`, or all drafts |
| POST | `/api/sync/:id` | Create or update the WooCommerce product |
| POST | `/api/sync/:id/stock` | Push local stock to WooCommerce |
| POST | `/api/sync/:id/pull` | Pull live stock back from WooCommerce |
| GET | `/api/sync/logs` | Audit trail |
| GET | `/api/sync/status` | Active integration modes |

## Project layout

```
server/   Express app, routes (products, sync), services (gemini, woocommerce, store), Jest tests
client/   Vite + React dashboard (components/ for each UI area)
```

## Design decisions

- **Sanitized AI output.** Generated HTML is stripped to `p, ul, ol, li, strong, em, br, h3` on the server before it is stored, and again in the preview.
- **No invented facts.** The prompt restricts the model to details present in the notes.
- **Stale detection.** Editing a synced product moves it back to *AI Enriched* so it is obvious that the store copy is out of date.
- **Find-or-create taxonomy.** WooCommerce needs category and tag IDs, so the live adapter resolves names to IDs first.
- **Persistence is in memory.** Data resets on restart by design; `server/services/store.js` is the single seam to replace with a database.
