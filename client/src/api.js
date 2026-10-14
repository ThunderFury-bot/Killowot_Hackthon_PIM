async function request(method, url, body) {
  const res = await fetch(`/api${url}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.details = data.details;
    throw err;
  }
  return data;
}

export const api = {
  products: () => request('GET', '/products'),
  metrics: () => request('GET', '/products/metrics'),
  logs: () => request('GET', '/sync/logs'),
  status: () => request('GET', '/sync/status'),
  create: (p) => request('POST', '/products', p),
  update: (id, p) => request('PUT', `/products/${id}`, p),
  remove: (id) => request('DELETE', `/products/${id}`),
  enrich: (id) => request('POST', `/products/${id}/enrich`),
  enrichBulk: () => request('POST', '/products/enrich-bulk', {}),
  importProducts: (payload) => request('POST', '/products/import', payload),
  exportProducts: (format = 'json') => request('GET', `/products/export?format=${encodeURIComponent(format)}`),
  sync: (id) => request('POST', `/sync/${id}`),
  webhookWooCommerce: (payload) => request('POST', '/sync/webhook/woocommerce', payload),
};
