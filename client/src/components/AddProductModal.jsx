import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

const EMPTY = { title: '', sku: '', price: '', stock: '', category: '', images: '', notes: '' };

export default function AddProductModal({ onClose, onCreate }) {
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await onCreate({
        title: f.title, sku: f.sku, category: f.category, notes: f.notes,
        price: Number(f.price), stock: Number(f.stock),
        images: f.images.split('\n').map((s) => s.trim()).filter(Boolean),
      });
    } catch (err) {
      setError([err.message, ...(err.details || [])].join(' · '));
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/80 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-label="Add product"
        className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-lg font-bold text-white">Add product</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="field-label" htmlFor="a-title">Title</label>
            <input id="a-title" className="input" required value={f.title} onChange={set('title')} placeholder="Trailhead 28L Daypack" /></div>
          <div><label className="field-label" htmlFor="a-sku">SKU</label>
            <input id="a-sku" className="input font-mono" required value={f.sku} onChange={set('sku')} placeholder="BAG-TH28" /></div>
          <div><label className="field-label" htmlFor="a-cat">Category</label>
            <input id="a-cat" className="input" value={f.category} onChange={set('category')} placeholder="Bags" /></div>
          <div><label className="field-label" htmlFor="a-price">Base price (USD)</label>
            <input id="a-price" className="input" type="number" min="0" step="0.01" required value={f.price} onChange={set('price')} /></div>
          <div><label className="field-label" htmlFor="a-stock">Stock quantity</label>
            <input id="a-stock" className="input" type="number" min="0" step="1" required value={f.stock} onChange={set('stock')} /></div>
          <div className="sm:col-span-2"><label className="field-label" htmlFor="a-img">Image URLs (one per line)</label>
            <textarea id="a-img" rows={3} className="input font-mono text-xs" value={f.images} onChange={set('images')} placeholder="https://…/front.jpg" /></div>
          <div className="sm:col-span-2"><label className="field-label" htmlFor="a-notes">Raw features and notes</label>
            <textarea id="a-notes" rows={4} className="input" value={f.notes} onChange={set('notes')}
              placeholder="ripstop nylon; 28 litre; padded laptop sleeve; olive green; 920 g" />
            <p className="mt-1 text-xs text-slate-500">The AI turns these notes into the product description, attributes and image alt text.</p></div>
          {error && <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300 sm:col-span-2">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Add product
          </button>
        </div>
      </form>
    </div>
  );
}
