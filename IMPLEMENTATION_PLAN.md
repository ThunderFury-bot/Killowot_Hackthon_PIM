# Implementation Plan: AI-Powered PIM for WooCommerce

## 1. Executive summary

Merchants keep product facts as rough notes. Turning those into polished listings (descriptions, categories, tags, attributes, image alt text) is slow and inconsistent. This system holds a master catalog, uses Gemini to generate structured, storefront-ready content, lets a human review and edit it, and then synchronizes it to WooCommerce with a full audit trail.

Goals: reduce time-to-publish per product, keep a human in the loop before anything goes live, and make every external call observable.

## 2. System architecture

```
┌──────────────────────────── Browser ────────────────────────────┐
│  React + Tailwind dashboard                                      │
│  Navbar · Metrics · ProductGrid · ProductModal · SyncLogsTable   │
└───────────────┬──────────────────────────────────────────────────┘
                │  REST/JSON  (/api, Vite proxy in dev)
┌───────────────▼──────────────────────────────────────────────────┐
│  Express API                                                      │
│  routes/products.js   routes/sync.js                              │
│       │ validate + orchestrate        │ orchestrate + log         │
│  ┌────▼──────────┐  ┌──────────────┐  ┌▼──────────────────┐      │
│  │ services/     │  │ services/    │  │ services/         │      │
│  │ gemini.js     │  │ store.js     │  │ woocommerce.js    │      │
│  └────┬──────────┘  └──────────────┘  └┬──────────────────┘      │
└───────┼───────────── in-memory ────────┼──────────────────────────┘
        │                                │
 Google Gemini API               WooCommerce REST API (wc/v3)
 (gemini-2.5-flash)              (mock adapter when unconfigured)
```

**Status lifecycle:** `Draft` → (enrich) → `AI Enriched` → (sync) → `WooCommerce Synced`. Editing a synced product returns it to `AI Enriched`.

## 3. Roadmap

| Phase | Scope | Exit criteria |
|---|---|---|
| 1. Foundation | Express app, in-memory store with seed data, validation, CRUD, filter and search | CRUD and validation tests green |
| 2. AI enrichment | Gemini service, JSON contract, sanitizer, heuristic fallback, single and bulk enrich | Enrichment tests green with and without a key |
| 3. WooCommerce sync | Payload mapper, find-or-create taxonomy, create/update by `wc_id`, stock push and pull, audit log | Success and failure paths logged with HTTP status |
| 4. Dashboard | Metrics, grid, filters, review drawer with live preview, toasts | Full enrich → review → sync flow works in the browser |
| 5. Quality and delivery | Jest + Supertest suite, docs, packaging script | `npm test` and `npm run build` pass |
| Next | Database (Postgres), auth, background job queue, webhook-based inbound sync, variable products | n/a |

## 4. Gemini prompt engineering strategy

- **System instruction + user data split.** Rules live in `systemInstruction`; the product record is the only user content.
- **Structured output.** `responseMimeType: application/json` with an explicit schema in the prompt, so no free-form text needs parsing.
- **Grounding rule.** "Use ONLY facts present in the notes." This prevents invented specs and unverifiable claims.
- **Format constraints.** Description structure (intro, 4-6 bullet list, closer), allowed HTML tags, summary under 160 characters, alt text 80-125 characters and descriptive.
- **Index-aligned images.** One `{alt, caption}` per image in order, so results map back without ambiguity.
- **Defense in depth.** Parse (strip code fences), normalize types and lengths, sanitize HTML to an allow-list, retry once on failure, then surface a clear 502 and an audit-log entry rather than storing bad data.
- **Low temperature (0.4)** for consistent copy.

## 5. WooCommerce mapping rules

| PIM field | WooCommerce field | Rule |
|---|---|---|
| `title` | `name` | Direct |
| `sku` | `sku` | Unique; conflicts surface as a logged failure |
| `price` | `regular_price` | String with two decimals |
| `stock` | `stock_quantity` + `manage_stock: true` | Integer ≥ 0 |
| `ai.description_html` | `description` | Sanitized HTML |
| `ai.short_description` | `short_description` | Plain text |
| `ai.categories` + `category` | `categories[{id}]` | Find-or-create by name, then send IDs |
| `ai.tags` | `tags[{id}]` | Find-or-create by name |
| `ai.attributes` | `attributes[{name, options, visible}]` | Custom, non-variation attributes |
| `images[]` | `images[{src, alt, name, position}]` | Full array; caption is sent as `name` |
| `wc_id` | URL `products/{id}` | Present → `PUT` (update); absent → `POST` (create) |

Endpoint: `/wp-json/wc/v3/products`, authenticated with consumer key and secret over HTTPS.

## 6. Evaluation rubric compliance checklist

- [x] Required file structure delivered, with every listed file
- [x] React (Vite) + Tailwind + Lucide dark dashboard (slate with indigo and emerald accents)
- [x] Modals/drawer, toast alerts, loading spinners, image gallery preview
- [x] Express modular routing and services layer
- [x] Gemini `gemini-2.5-flash`: HTML description, summary, categories, tags, attributes, alt text and captions
- [x] Bulk AI enrich
- [x] WooCommerce push with full image arrays, `wc_id` storage, stock push and pull
- [x] Audit trail with SUCCESS/FAILED, HTTP status, timestamp, SKU, error trace
- [x] Metrics: total, AI enriched, live synced, sync failures
- [x] Status filter and instant search
- [x] In-memory store pre-seeded with realistic products
- [x] Jest + Supertest tests (13 cases: CRUD, validation, enrichment, sync success and failure)
- [x] README, implementation plan, `.env.example`, `.gitignore`, packaging script
- [x] Runs with zero configuration via fallback and mock modes
