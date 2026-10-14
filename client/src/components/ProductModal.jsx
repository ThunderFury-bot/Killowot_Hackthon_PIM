import { useEffect, useState } from 'react';
import { X, Sparkles, UploadCloud, Save, Trash2, Loader2 } from 'lucide-react';
import StatusBadge from './StatusBadge';

// Mirrors the server allow-list so the live preview never renders unsafe markup.
const ALLOWED = new Set(['p', 'ul', 'ol', 'li', 'strong', 'em', 'br', 'h3']);
const safeHtml = (html = '') =>
  html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<(\/?)([a-z0-9]+)[^>]*>/gi, (_, s, t) => (ALLOWED.has(t.toLowerCase()) ? `<${s}${t.toLowerCase()}>` : ''));

const attrsToText = (attrs = []) => attrs.map((a) => `${a.name}: ${a.options.join(', ')}`).join('\n');
const textToAttrs = (text) => text.split('\n').map((l) => l.split(':')).filter(([n, o]) => n?.trim() && o?.trim())
  .map(([n, ...o]) => ({ name: n.trim(), options: o.join(':').split(',').map((s) => s.trim()).filter(Boolean) }));
const list = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

const toForm = (p) => ({
  title: p.title, sku: p.sku, price: String(p.price), stock: String(p.stock), category: p.category, notes: p.notes,
  images: p.images.map((i) => ({ ...i })),
  html: p.ai?.description_html || '', summary: p.ai?.short_description || '',
  categories: (p.ai?.categories || []).join(', '), tags: (p.ai?.tags || []).join(', '), attrs: attrsToText(p.ai?.attributes),
});

export default function ProductModal({ product, busy, onClose, onSave, onEnrich, onSync, onDelete }) {
  const [f, setF] = useState(() => toForm(product));
  const [active, setActive] = useState(0);
  useEffect(() => { setF(toForm(product)); }, [product.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const setImg = (i, k, v) => setF((s) => ({ ...s, images: s.images.map((im, j) => (j === i ? { ...im, [k]: v } : im)) }));

  const payload = () => ({
    title: f.title, sku: f.sku, category: f.category, notes: f.notes,
    price: Number(f.price), stock: Number(f.stock), images: f.images,
    ...(product.ai && { ai: { description_html: f.html, short_description: f.summary, categories: list(f.categories), tags: list(f.tags), attributes: textToAttrs(f.attrs) } }),
  });

  const hero = f.images[active] || f.images[0];
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" aria-label={`Edit ${product.title}`}
        className="drawer-in flex h-full w-full max-w-2xl flex-col border-l border-slate-800 bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-white">{product.title}</h2>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={product.status} />
              <span className="font-mono text-xs text-slate-500">{product.sku}</span>
              {product.wc_id && <span className="text-xs text-emerald-300">WooCommerce #{product.wc_id}</span>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {hero && (
            <div>
              <img src={hero.src} alt={hero.alt || f.title} className="aspect-[16/10] w-full rounded-xl bg-slate-800 object-cover" />
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {f.images.map((im, i) => (
                  <button key={i} onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-2 ${i === active ? 'ring-indigo-400' : 'ring-transparent opacity-70 hover:opacity-100'}`}>
                    <img src={im.src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="field-label" htmlFor="m-title">Title</label>
              <input id="m-title" className="input" value={f.title} onChange={set('title')} /></div>
            <div><label className="field-label" htmlFor="m-sku">SKU</label>
              <input id="m-sku" className="input font-mono" value={f.sku} onChange={set('sku')} /></div>
            <div><label className="field-label" htmlFor="m-cat">Category</label>
              <input id="m-cat" className="input" value={f.category} onChange={set('category')} /></div>
            <div><label className="field-label" htmlFor="m-price">Base price (USD)</label>
              <input id="m-price" type="number" min="0" step="0.01" className="input" value={f.price} onChange={set('price')} /></div>
            <div><label className="field-label" htmlFor="m-stock">Stock quantity</label>
              <input id="m-stock" type="number" min="0" step="1" className="input" value={f.stock} onChange={set('stock')} /></div>
            <div className="sm:col-span-2"><label className="field-label" htmlFor="m-notes">Raw features and notes</label>
              <textarea id="m-notes" rows={3} className="input" value={f.notes} onChange={set('notes')} /></div>
          </div>

          {product.ai ? (
            <div className="space-y-4 rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white">AI-generated copy</h3>
                <span className="text-xs text-slate-400">Source: {product.ai.source}</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="field-label" htmlFor="m-html">Description (HTML)</label>
                  <textarea id="m-html" rows={10} className="input font-mono text-xs" value={f.html} onChange={set('html')} /></div>
                <div><span className="field-label">Storefront preview</span>
                  <div className="copy-preview h-[15.5rem] overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300"
                    dangerouslySetInnerHTML={{ __html: safeHtml(f.html) }} /></div>
              </div>
              <div><label className="field-label" htmlFor="m-sum">Short summary</label>
                <textarea id="m-sum" rows={2} className="input" value={f.summary} onChange={set('summary')} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="field-label" htmlFor="m-cats">Categories (comma separated)</label>
                  <input id="m-cats" className="input" value={f.categories} onChange={set('categories')} /></div>
                <div><label className="field-label" htmlFor="m-tags">Tags (comma separated)</label>
                  <input id="m-tags" className="input" value={f.tags} onChange={set('tags')} /></div>
              </div>
              <div><label className="field-label" htmlFor="m-attrs">Attributes (one per line, “Name: option, option”)</label>
                <textarea id="m-attrs" rows={3} className="input font-mono text-xs" value={f.attrs} onChange={set('attrs')} /></div>
              <div>
                <span className="field-label">Image alt text and captions</span>
                <div className="space-y-2">
                  {f.images.map((im, i) => (
                    <div key={i} className="flex gap-3">
                      <img src={im.src} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
                      <div className="grid flex-1 gap-2 sm:grid-cols-2">
                        <input aria-label={`Alt text for image ${i + 1}`} placeholder="Alt text" className="input" value={im.alt} onChange={(e) => setImg(i, 'alt', e.target.value)} />
                        <input aria-label={`Caption for image ${i + 1}`} placeholder="Caption" className="input" value={im.caption} onChange={(e) => setImg(i, 'caption', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center">
              <p className="font-semibold text-white">No AI copy yet</p>
              <p className="mt-1 text-sm text-slate-400">Enrich this product to generate its description, tags, attributes and image alt text.</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 px-6 py-4">
          <button onClick={() => window.confirm(`Delete "${product.title}"?`) && onDelete(product.id)} className="btn-danger" aria-label="Delete product"><Trash2 className="h-4 w-4" /></button>
          <div className="ml-auto flex flex-wrap gap-2">
            <button onClick={() => onSave(product.id, payload())} disabled={busy} className="btn-ghost"><Save className="h-4 w-4" />Save changes</button>
            <button onClick={() => onEnrich(product.id)} disabled={busy} className="btn-primary">
              {busy === 'enrich' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {product.ai ? 'Re-enrich' : 'Enrich with AI'}
            </button>
            <button onClick={() => onSync(product.id, payload())} disabled={busy || !product.ai} className="btn-success">
              {busy === 'sync' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              Sync to WooCommerce
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
