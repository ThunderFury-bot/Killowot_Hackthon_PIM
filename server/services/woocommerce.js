// WooCommerce integration. Runs against a real store when WC_* env vars are set, otherwise simulates responses.
// Mock mode rejects any SKU starting with "FAIL-" so failure handling can be demonstrated.
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;

class WooError extends Error {
  constructor(message, httpStatus = 502) {
    super(message);
    this.httpStatus = httpStatus;
  }
}

const isLive = () => Boolean(process.env.WC_URL && process.env.WC_CONSUMER_KEY && process.env.WC_CONSUMER_SECRET);
const mode = () => (isLive() ? 'live' : 'mock');
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

let client;
const getClient = () =>
  (client ||= new WooCommerceRestApi({
    url: process.env.WC_URL,
    consumerKey: process.env.WC_CONSUMER_KEY,
    consumerSecret: process.env.WC_CONSUMER_SECRET,
    version: 'wc/v3',
  }));

const toWooError = (err) =>
  new WooError(err.response?.data?.message || err.message, err.response?.status || 502);

// WooCommerce expects term IDs, so find-or-create each category/tag by name.
async function resolveTerms(endpoint, names) {
  const ids = [];
  for (const name of names) {
    const found = await getClient().get(endpoint, { search: name, per_page: 5 });
    const hit = found.data.find((t) => t.name.toLowerCase() === name.toLowerCase());
    const id = hit ? hit.id : (await getClient().post(endpoint, { name })).data.id;
    ids.push({ id });
  }
  return ids;
}

async function buildPayload(p, withTerms) {
  const ai = p.ai || {};
  const categoryNames = [...new Set([...(ai.categories || []), p.category].filter(Boolean))];
  return {
    name: p.title,
    type: 'simple',
    status: 'publish',
    sku: p.sku,
    regular_price: Number(p.price).toFixed(2),
    manage_stock: true,
    stock_quantity: p.stock,
    description: ai.description_html || '',
    short_description: ai.short_description || '',
    categories: withTerms ? await resolveTerms('products/categories', categoryNames) : categoryNames.map((name) => ({ name })),
    tags: withTerms ? await resolveTerms('products/tags', ai.tags || []) : (ai.tags || []).map((name) => ({ name })),
    attributes: (ai.attributes || []).map((a, i) => ({ name: a.name, position: i, visible: true, variation: false, options: a.options })),
    images: p.images.map((im, position) => ({ src: im.src, alt: im.alt, name: im.caption || im.alt, position })),
  };
}

async function pushProduct(p) {
  if (!isLive()) {
    await delay(60);
    if (/^FAIL-/i.test(p.sku)) throw new WooError('Simulated error: product with this SKU already exists (woocommerce_rest_product_not_created)', 400);
    return { wc_id: p.wc_id || 1000 + Math.floor(Math.random() * 9000), httpStatus: p.wc_id ? 200 : 201, mode: 'mock' };
  }
  try {
    const payload = await buildPayload(p, true);
    const res = p.wc_id ? await getClient().put(`products/${p.wc_id}`, payload) : await getClient().post('products', payload);
    return { wc_id: res.data.id, httpStatus: res.status, mode: 'live' };
  } catch (err) {
    throw toWooError(err);
  }
}

async function updateStock(p) {
  if (!p.wc_id) throw new WooError('Product has not been synced to WooCommerce yet', 409);
  if (!isLive()) { await delay(40); return { httpStatus: 200, mode: 'mock' }; }
  try {
    const res = await getClient().put(`products/${p.wc_id}`, { manage_stock: true, stock_quantity: p.stock });
    return { httpStatus: res.status, mode: 'live' };
  } catch (err) {
    throw toWooError(err);
  }
}

// Second half of the two-way sync: read the live stock level back from WooCommerce.
async function pullStock(p) {
  if (!p.wc_id) throw new WooError('Product has not been synced to WooCommerce yet', 409);
  if (!isLive()) { await delay(40); return { stock: p.stock, httpStatus: 200, mode: 'mock' }; }
  try {
    const res = await getClient().get(`products/${p.wc_id}`);
    return { stock: res.data.stock_quantity ?? 0, httpStatus: res.status, mode: 'live' };
  } catch (err) {
    throw toWooError(err);
  }
}

module.exports = { pushProduct, updateStock, pullStock, buildPayload, mode, WooError };
