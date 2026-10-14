const router = require('express').Router();
const store = require('../services/store');
const gemini = require('../services/gemini');
const { HttpError, asyncHandler } = require('../utils');

const isUrl = (s) => /^https?:\/\/\S+$/i.test(s);

function validate(b, partial = false) {
  const errors = [];
  const check = (key, ok, msg) => { if ((!partial || b[key] !== undefined) && !ok(b[key])) errors.push(msg); };
  check('title', (v) => typeof v === 'string' && v.trim(), 'title is required');
  check('sku', (v) => typeof v === 'string' && /^[\w.-]+$/.test(v.trim()), 'sku is required (letters, numbers, - _ .)');
  check('price', (v) => typeof v === 'number' && v >= 0, 'price must be a number >= 0');
  check('stock', (v) => Number.isInteger(v) && v >= 0, 'stock must be an integer >= 0');
  check('images', (v) => Array.isArray(v) && v.every((i) => isUrl(typeof i === 'string' ? i : i?.src || '')),
    'images must be an array of http(s) URLs');
  return errors;
}

function clean(b) {
  const out = {};
  if (b.title !== undefined) out.title = b.title.trim();
  if (b.sku !== undefined) out.sku = b.sku.trim();
  ['price', 'stock'].forEach((k) => { if (b[k] !== undefined) out[k] = b[k]; });
  if (b.category !== undefined) out.category = String(b.category).trim();
  if (b.notes !== undefined) out.notes = String(b.notes);
  if (b.images !== undefined) {
    out.images = b.images.map((i) => (typeof i === 'string' ? { src: i, alt: '', caption: '' }
      : { src: i.src, alt: i.alt || '', caption: i.caption || '' }));
  }
  if (b.ai && typeof b.ai === 'object') {
    out.ai = {};
    if (b.ai.description_html !== undefined) out.ai.description_html = gemini.sanitizeHtml(b.ai.description_html);
    if (b.ai.short_description !== undefined) out.ai.short_description = String(b.ai.short_description);
    ['categories', 'tags', 'attributes'].forEach((k) => { if (Array.isArray(b.ai[k])) out.ai[k] = b.ai[k]; });
  }
  return out;
}

const getOr404 = (id) => {
  const p = store.find(id);
  if (!p) throw new HttpError(404, 'Product not found');
  return p;
};

function parseBulkImportPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new HttpError(400, 'Import payload must be a JSON object or CSV text');

  if (payload.mode === 'csv' || typeof payload.content === 'string' && payload.content.trim().toLowerCase().startsWith('title,')) {
    const text = String(payload.content || '').trim();
    if (!text) throw new HttpError(400, 'CSV content is empty');
    const lines = text.split(/\r?\n/).filter(Boolean);
    const headers = lines[0].split(',').map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim());
      const row = {};
      headers.forEach((header, index) => { row[header] = values[index] ?? ''; });
      return row;
    }).filter((row) => row.title || row.sku);

    return rows.map((row) => ({
      title: String(row.title || '').trim(),
      sku: String(row.sku || '').trim(),
      price: Number(row.price || 0),
      stock: Number(row.stock || 0),
      category: String(row.category || '').trim(),
      notes: String(row.notes || '').trim(),
      images: [],
    }));
  }

  if (Array.isArray(payload.products)) return payload.products;
  if (Array.isArray(payload)) return payload;
  if (payload.mode === 'json' && typeof payload.content === 'string') {
    const parsed = JSON.parse(payload.content);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.products)) return parsed.products;
  }
  throw new HttpError(400, 'Payload must contain a products array or valid CSV rows');
}

async function enrichOne(id) {
  const p = getOr404(id);
  try {
    const { ai, imageMeta } = await gemini.enrichProduct(p);
    const updated = store.setEnrichment(id, ai, imageMeta);
    store.addLog({ productId: id, sku: p.sku, action: 'ENRICH', status: 'SUCCESS', message: `Enriched via ${ai.source}` });
    return updated;
  } catch (err) {
    store.addLog({ productId: id, sku: p.sku, action: 'ENRICH', status: 'FAILED', message: 'Enrichment failed', error: err.message });
    throw err;
  }
}

router.get('/', (req, res) => res.json(store.list({ status: req.query.status, q: req.query.q })));
router.get('/metrics', (req, res) => res.json(store.metrics()));

router.get('/export', (req, res) => {
  const format = String(req.query.format || 'json').toLowerCase();
  const products = store.list();
  const payload = products.map((p) => ({
    id: p.id,
    title: p.title,
    sku: p.sku,
    price: p.price,
    stock: p.stock,
    category: p.category,
    notes: p.notes,
    status: p.status,
    images: p.images.map((img) => ({ src: img.src, alt: img.alt, caption: img.caption })),
    ai: p.ai,
    wc_id: p.wc_id,
    lastSyncStatus: p.lastSyncStatus,
    lastSyncedAt: p.lastSyncedAt,
  }));

  if (format === 'csv') {
    const headers = ['title', 'sku', 'price', 'stock', 'category', 'notes', 'status'];
    const rows = payload.map((row) => [
      row.title,
      row.sku,
      row.price,
      row.stock,
      row.category,
      row.notes,
      row.status,
    ].map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','));
    res.type('text/csv').send([headers.join(','), ...rows].join('\n'));
    return;
  }

  res.json({ products: payload });
});

router.post('/import', asyncHandler(async (req, res) => {
  const raw = req.body || {};
  const items = parseBulkImportPayload(raw);
  const validItems = [];

  for (const item of items) {
    const next = {
      title: String(item.title || '').trim(),
      sku: String(item.sku || '').trim(),
      price: Number(item.price ?? 0),
      stock: Number(item.stock ?? 0),
      category: String(item.category || '').trim(),
      notes: String(item.notes || '').trim(),
      images: Array.isArray(item.images) ? item.images.filter(Boolean) : [],
    };

    const errors = validate(next);
    if (errors.length) continue;
    if (store.skuExists(next.sku)) continue;
    validItems.push(clean(next));
  }

  const created = validItems.map((item) => store.create(item));
  res.status(201).json({ created: created.length, items: created });
}));

router.post('/enrich-bulk', asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : store.list({ status: store.STATUS.DRAFT }).map((p) => p.id);
  const results = [];
  for (let i = 0; i < ids.length; i += 3) { // small concurrency window to respect API rate limits
    const batch = await Promise.all(ids.slice(i, i + 3).map(async (id) => {
      const sku = store.find(id)?.sku;
      try { await enrichOne(id); return { id, sku, ok: true }; }
      catch (err) { return { id, sku, ok: false, error: err.message }; }
    }));
    results.push(...batch);
  }
  res.json({ results, enriched: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length });
}));

router.post('/', (req, res) => {
  const errors = validate(req.body || {});
  if (errors.length) throw new HttpError(400, 'Validation failed', errors);
  const data = clean(req.body);
  if (store.skuExists(data.sku)) throw new HttpError(409, `SKU "${data.sku}" already exists`);
  res.status(201).json(store.create(data));
});

router.get('/:id', (req, res) => res.json(getOr404(req.params.id)));

router.put('/:id', (req, res) => {
  getOr404(req.params.id);
  const errors = validate(req.body || {}, true);
  if (errors.length) throw new HttpError(400, 'Validation failed', errors);
  const data = clean(req.body);
  if (data.sku && store.skuExists(data.sku, req.params.id)) throw new HttpError(409, `SKU "${data.sku}" already exists`);
  res.json(store.update(req.params.id, data));
});

router.delete('/:id', (req, res) => {
  if (!store.remove(req.params.id)) throw new HttpError(404, 'Product not found');
  res.status(204).end();
});

router.post('/:id/enrich', asyncHandler(async (req, res) => res.json(await enrichOne(req.params.id))));

module.exports = router;
