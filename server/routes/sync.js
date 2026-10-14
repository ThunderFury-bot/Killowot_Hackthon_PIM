const router = require('express').Router();
const store = require('../services/store');
const woo = require('../services/woocommerce');
const { HttpError, asyncHandler } = require('../utils');

router.get('/status', (req, res) => res.json({
  woocommerce: woo.mode(),
  gemini: process.env.GEMINI_API_KEY ? 'live' : 'fallback',
  model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
}));

router.get('/logs', (req, res) => res.json(store.getLogs()));

router.post('/webhook/woocommerce', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const event = body.event || body.type || 'product.updated';
  const payload = body.data || body;
  const product = payload.product || payload;

  if (!product || typeof product !== 'object') {
    throw new HttpError(400, 'Missing WooCommerce product payload');
  }

  const sku = typeof product.sku === 'string' ? product.sku.trim() : '';
  const wcId = product.id ?? product.wc_id ?? product.product_id;
  const matches = store.list().filter((p) => {
    const idMatch = wcId !== undefined && p.wc_id !== null && Number(p.wc_id) === Number(wcId);
    const skuMatch = sku && p.sku && p.sku.toLowerCase() === sku.toLowerCase();
    return idMatch || skuMatch;
  });

  if (!matches.length) {
    store.addLog({
      productId: null,
      sku: sku || null,
      action: 'WEBHOOK',
      status: 'SKIPPED',
      httpStatus: 202,
      message: `No local product matched WooCommerce ${event}`,
    });
    return res.status(202).json({ accepted: true, matched: false, event, message: 'No local product matched WooCommerce payload' });
  }

  const existing = matches[0];
  const patch = {};

  if (typeof product.name === 'string' && product.name.trim()) patch.title = product.name.trim();
  if (sku) patch.sku = sku;
  if (product.regular_price !== undefined) patch.price = Number(product.regular_price) || 0;
  if (product.stock_quantity !== undefined) patch.stock = Number(product.stock_quantity) || 0;
  if (Array.isArray(product.categories) && product.categories.length) {
    const categoryName = product.categories.map((entry) => entry?.name || entry).find(Boolean);
    if (categoryName) patch.category = String(categoryName).trim();
  }

  if (typeof product.short_description === 'string' && product.short_description.trim()) {
    patch.ai = { ...(existing.ai || {}), short_description: product.short_description.trim() };
  }

  const updated = store.update(existing.id, patch);
  if (wcId !== undefined && wcId !== null) {
    store.setSynced(existing.id, Number(wcId));
  }

  store.addLog({
    productId: existing.id,
    sku: updated?.sku || existing.sku,
    action: 'WEBHOOK',
    status: 'SUCCESS',
    httpStatus: 200,
    message: `WooCommerce ${event} synced to master catalog`,
  });

  res.json({ accepted: true, matched: true, event, productId: existing.id, sku: updated?.sku || existing.sku, product: updated });
}));

async function run(id, action, task) {
  const p = store.find(id);
  if (!p) throw new HttpError(404, 'Product not found');
  try {
    const out = await task(p);
    store.addLog({ productId: p.id, sku: p.sku, action, status: 'SUCCESS', httpStatus: out.httpStatus,
      message: `${action} completed (${woo.mode()} mode)` });
    return store.find(p.id);
  } catch (err) {
    if (action === 'PUSH') store.markSyncFailed(p.id);
    const httpStatus = err.httpStatus || 500;
    store.addLog({ productId: p.id, sku: p.sku, action, status: 'FAILED', httpStatus,
      message: `${action} failed`, error: err.stack || err.message });
    throw new HttpError(httpStatus >= 500 ? 502 : httpStatus, err.message);
  }
}

router.post('/:id/stock', asyncHandler(async (req, res) => {
  res.json(await run(req.params.id, 'STOCK', (p) => woo.updateStock(p)));
}));

router.post('/:id/pull', asyncHandler(async (req, res) => {
  res.json(await run(req.params.id, 'PULL', async (p) => {
    const r = await woo.pullStock(p);
    store.update(p.id, { stock: r.stock });
    store.setSynced(p.id, p.wc_id);
    return r;
  }));
}));

router.post('/:id', asyncHandler(async (req, res) => {
  const existing = store.find(req.params.id);
  if (existing && !existing.ai) throw new HttpError(409, 'Enrich this product with AI before syncing');
  res.json(await run(req.params.id, 'PUSH', async (p) => {
    const r = await woo.pushProduct(p);
    store.setSynced(p.id, r.wc_id);
    return r;
  }));
}));

module.exports = router;
