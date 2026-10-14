process.env.GEMINI_API_KEY = ''; // force heuristic fallback (never hit the network in tests)
process.env.WC_URL = '';
process.env.WC_CONSUMER_KEY = '';
process.env.WC_CONSUMER_SECRET = '';

const request = require('supertest');
const app = require('../server');
const store = require('../services/store');
const { sanitizeHtml } = require('../services/gemini');

const valid = { title: 'Test Lamp', sku: 'LAMP-01', price: 25.5, stock: 7, images: ['https://example.com/a.jpg'], notes: 'brass; 30 cm tall' };

beforeEach(() => store.reset());

describe('Catalog API', () => {
  test('lists seeded products', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(6);
  });

  test('filters by status and search', async () => {
    const enriched = await request(app).get('/api/products?status=AI%20Enriched');
    expect(enriched.body.every((p) => p.status === 'AI Enriched')).toBe(true);
    const search = await request(app).get('/api/products?q=daypack');
    expect(search.body).toHaveLength(1);
  });

  test('creates a product as Draft', async () => {
    const res = await request(app).post('/api/products').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('Draft');
    expect(res.body.images[0].src).toBe(valid.images[0]);
  });

  test('rejects invalid payloads with details', async () => {
    const res = await request(app).post('/api/products').send({ title: '', sku: 'x y', price: -1, stock: 1.5 });
    expect(res.status).toBe(400);
    expect(res.body.details.length).toBeGreaterThanOrEqual(4);
  });

  test('rejects duplicate SKUs', async () => {
    await request(app).post('/api/products').send(valid);
    const res = await request(app).post('/api/products').send(valid);
    expect(res.status).toBe(409);
  });

  test('updates and deletes a product', async () => {
    const { body } = await request(app).post('/api/products').send(valid);
    const put = await request(app).put(`/api/products/${body.id}`).send({ price: 30 });
    expect(put.body.price).toBe(30);
    expect((await request(app).delete(`/api/products/${body.id}`)).status).toBe(204);
    expect((await request(app).get(`/api/products/${body.id}`)).status).toBe(404);
  });
});

describe('AI enrichment', () => {
  test('enriches a draft into structured content', async () => {
    const res = await request(app).post('/api/products/p-1/enrich');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('AI Enriched');
    expect(res.body.ai.description_html).toContain('<ul>');
    expect(res.body.ai.attributes.map((a) => a.name)).toEqual(expect.arrayContaining(['Color', 'Material']));
    expect(res.body.images.every((i) => i.alt)).toBe(true);
  });

  test('bulk-enriches every draft', async () => {
    const res = await request(app).post('/api/products/enrich-bulk').send({});
    expect(res.body.failed).toBe(0);
    expect(res.body.enriched).toBe(5);
    expect((await request(app).get('/api/products/metrics')).body.drafts).toBe(0);
  });

  test('sanitizes unsafe HTML', () => {
    expect(sanitizeHtml('<p onclick="x()">Hi</p><script>alert(1)</script><img src=x>')).toBe('<p>Hi</p>');
  });
});

describe('WooCommerce sync', () => {
  test('blocks syncing un-enriched drafts', async () => {
    const res = await request(app).post('/api/sync/p-1');
    expect(res.status).toBe(409);
  });

  test('syncs an enriched product and stores wc_id', async () => {
    const res = await request(app).post('/api/sync/p-6');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('WooCommerce Synced');
    expect(res.body.wc_id).toBeGreaterThan(0);
    const logs = (await request(app).get('/api/sync/logs')).body;
    expect(logs[0]).toMatchObject({ sku: 'BTL-SM750', action: 'PUSH', status: 'SUCCESS', httpStatus: 201 });
  });

  test('logs failures and counts them in metrics', async () => {
    const { body } = await request(app).post('/api/products').send({ ...valid, sku: 'FAIL-001' });
    await request(app).post(`/api/products/${body.id}/enrich`);
    const res = await request(app).post(`/api/sync/${body.id}`);
    expect(res.status).toBe(400);
    const logs = (await request(app).get('/api/sync/logs')).body;
    expect(logs[0]).toMatchObject({ status: 'FAILED', action: 'PUSH', httpStatus: 400 });
    expect(logs[0].error).toBeTruthy();
    expect((await request(app).get('/api/products/metrics')).body.syncFailures).toBe(1);
  });

  test('editing a synced product marks it stale; stock push needs a wc_id', async () => {
    expect((await request(app).post('/api/sync/p-6/stock')).status).toBe(409);
    await request(app).post('/api/sync/p-6');
    const put = await request(app).put('/api/products/p-6').send({ stock: 99 });
    expect(put.body.status).toBe('AI Enriched');
    expect((await request(app).post('/api/sync/p-6/stock')).status).toBe(200);
  });
});
