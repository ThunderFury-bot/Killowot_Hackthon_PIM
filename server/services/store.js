// In-memory persistence layer, pre-seeded for zero-config demos.
const { randomUUID } = require('crypto');

const STATUS = { DRAFT: 'Draft', ENRICHED: 'AI Enriched', SYNCED: 'WooCommerce Synced' };
const now = () => new Date().toISOString();
const pic = (seed, alt) => ({ src: `https://picsum.photos/seed/${seed}/800/800`, alt, caption: '' });

const make = (id, title, sku, price, stock, category, images, notes) => ({
  id, title, sku, price, stock, category, images, notes,
  status: STATUS.DRAFT, ai: null, wc_id: null,
  lastSyncStatus: null, lastSyncedAt: null, createdAt: now(), updatedAt: now(),
});

const seedProducts = () => {
  const enriched = make('p-6', 'Summit Insulated Bottle 750ml', 'BTL-SM750', 34.5, 120, 'Drinkware',
    [pic('bottle1', 'Steel bottle front'), pic('bottle2', 'Steel bottle open lid')],
    'double-wall stainless steel; keeps cold 24h, hot 12h; matte black; 750 ml; 410 g');
  enriched.status = STATUS.ENRICHED;
  enriched.ai = {
    description_html: '<p>Keep every sip at the right temperature from sunrise to sunset.</p><ul><li>Double-wall stainless steel construction</li><li>Cold for 24 hours, hot for 12 hours</li><li>Matte black powder-coat finish</li></ul>',
    short_description: 'A 750 ml double-wall steel bottle that keeps drinks cold for 24 hours or hot for 12.',
    categories: ['Drinkware', 'Outdoor'], tags: ['insulated bottle', 'stainless steel', 'hydration'],
    attributes: [{ name: 'Color', options: ['Matte Black'] }, { name: 'Material', options: ['Stainless Steel'] },
      { name: 'Weight', options: ['410 g'] }],
    source: 'seed', enrichedAt: now(),
  };
  enriched.images[0].alt = 'Matte black 750 ml insulated stainless steel bottle, front view';
  enriched.images[1].alt = 'Insulated steel bottle with the lid open';

  return [
    make('p-1', 'Trailhead 28L Daypack', 'BAG-TH28', 89, 42, 'Bags',
      [pic('pack1', 'Daypack front'), pic('pack2', 'Daypack side'), pic('pack3', 'Daypack interior')],
      'ripstop nylon; 28 litre; padded laptop sleeve; olive green; 45 x 28 x 18 cm; 920 g; rain cover included'),
    make('p-2', 'Kiln Ceramic Pour-Over Set', 'KIT-PO02', 64.9, 18, 'Kitchen',
      [pic('kiln1', 'Pour-over dripper and carafe')],
      'handmade ceramic dripper; glass carafe 600 ml; cream glaze; includes 40 paper filters; dishwasher safe'),
    make('p-3', 'Ridgeline Wireless Keyboard', 'KEY-RL75', 129, 55, 'Electronics',
      [pic('key1', 'Keyboard top view'), pic('key2', 'Keyboard keycaps close-up')],
      '75% layout; hot-swappable switches; aluminium case; bluetooth 5.1 + USB-C; charcoal grey; 36 x 13 x 4 cm; 780 g'),
    make('p-4', 'Fjord Merino Beanie', 'APP-FB01', 29, 210, 'Apparel',
      [pic('beanie1', 'Navy merino beanie')],
      '100% merino wool; navy; ribbed knit; one size; unisex; machine washable'),
    make('p-5', 'Terra Cork Yoga Mat', 'FIT-CM05', 72, 0, 'Fitness',
      [pic('mat1', 'Rolled cork yoga mat'), pic('mat2', 'Cork yoga mat unrolled')],
      'natural cork top; rubber base; 183 x 61 cm; 5 mm thick; non-slip when wet; 2.1 kg'),
    enriched,
  ];
};

let products = [];
let logs = [];
const reset = () => { products = seedProducts(); logs = []; };
reset();

const find = (id) => products.find((p) => p.id === id) || null;

function list({ status, q } = {}) {
  const needle = (q || '').trim().toLowerCase();
  return products.filter((p) =>
    (!status || status === 'all' || p.status === status) &&
    (!needle || [p.title, p.sku, p.category, p.notes].some((f) => (f || '').toLowerCase().includes(needle))));
}

const skuExists = (sku, exceptId) =>
  products.some((p) => p.sku.toLowerCase() === String(sku).toLowerCase() && p.id !== exceptId);

function create(data) {
  const p = make(`p-${randomUUID().slice(0, 8)}`, data.title, data.sku, data.price, data.stock,
    data.category || '', data.images || [], data.notes || '');
  products.unshift(p);
  return p;
}

const EDITABLE = ['title', 'sku', 'price', 'stock', 'category', 'images', 'notes'];
function update(id, patch) {
  const p = find(id);
  if (!p) return null;
  EDITABLE.forEach((k) => { if (patch[k] !== undefined) p[k] = patch[k]; });
  if (patch.ai && p.ai) p.ai = { ...p.ai, ...patch.ai };
  else if (patch.ai) p.ai = { ...patch.ai, source: 'manual', enrichedAt: now() };
  // Editing a live product means the storefront copy is stale until re-synced.
  if (p.status === STATUS.SYNCED) p.status = STATUS.ENRICHED;
  if (p.status === STATUS.DRAFT && patch.ai) p.status = STATUS.ENRICHED;
  p.updatedAt = now();
  return p;
}

function setEnrichment(id, ai, imageMeta = []) {
  const p = find(id);
  if (!p) return null;
  p.ai = { ...ai, enrichedAt: now() };
  p.images = p.images.map((im, i) => ({ ...im, alt: imageMeta[i]?.alt || im.alt, caption: imageMeta[i]?.caption || im.caption }));
  if (!p.category && ai.categories?.[0]) p.category = ai.categories[0];
  p.status = STATUS.ENRICHED;
  p.updatedAt = now();
  return p;
}

function setSynced(id, wcId) {
  const p = find(id);
  p.wc_id = wcId; p.status = STATUS.SYNCED;
  p.lastSyncStatus = 'SUCCESS'; p.lastSyncedAt = now(); p.updatedAt = now();
  return p;
}

function markSyncFailed(id) {
  const p = find(id);
  if (p) { p.lastSyncStatus = 'FAILED'; p.updatedAt = now(); }
}

const remove = (id) => {
  const i = products.findIndex((p) => p.id === id);
  return i === -1 ? false : (products.splice(i, 1), true);
};

function addLog(entry) {
  const log = { id: randomUUID(), timestamp: now(), httpStatus: null, message: '', error: null, ...entry };
  logs.unshift(log);
  if (logs.length > 500) logs.pop();
  return log;
}

const getLogs = () => logs;

function metrics() {
  return {
    total: products.length,
    drafts: products.filter((p) => p.status === STATUS.DRAFT).length,
    enriched: products.filter((p) => p.status === STATUS.ENRICHED).length,
    synced: products.filter((p) => p.status === STATUS.SYNCED).length,
    aiEnriched: products.filter((p) => p.ai).length,
    syncFailures: products.filter((p) => p.lastSyncStatus === 'FAILED').length,
    syncEvents: logs.length,
  };
}

module.exports = { STATUS, reset, find, list, skuExists, create, update, setEnrichment, setSynced,
  markSyncFailed, remove, addLog, getLogs, metrics };
