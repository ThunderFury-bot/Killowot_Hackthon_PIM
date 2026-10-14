import { Search, Sparkles, UploadCloud, Loader2, Eye, ImageOff, PackageOpen } from 'lucide-react';
import StatusBadge from './StatusBadge';

const FILTERS = ['all', 'Draft', 'AI Enriched', 'WooCommerce Synced'];
const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

function Card({ p, busy, onOpen, onEnrich, onSync }) {
  const cover = p.images[0];
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <button onClick={() => onOpen(p.id)} className="relative aspect-square bg-slate-800" aria-label={`Open ${p.title}`}>
        {cover ? <img src={cover.src} alt={cover.alt || p.title} loading="lazy" className="h-full w-full object-cover" />
          : <ImageOff className="m-auto h-8 w-8 text-slate-600" />}
        <span className="absolute left-3 top-3"><StatusBadge status={p.status} /></span>
        {p.images.length > 1 && (
          <span className="absolute bottom-3 right-3 rounded-md bg-slate-950/80 px-2 py-0.5 text-xs font-semibold">{p.images.length} photos</span>
        )}
      </button>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-bold leading-snug text-white">{p.title}</h3>
        <p className="mt-1 font-mono text-xs text-slate-500">{p.sku}</p>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-lg font-bold text-white">{money(p.price)}</span>
          <span className={`text-sm ${p.stock === 0 ? 'font-semibold text-rose-300' : 'text-slate-400'}`}>
            {p.stock === 0 ? 'Out of stock' : `${p.stock} in stock`}
          </span>
        </div>
        {p.lastSyncStatus === 'FAILED' && <p className="mt-2 text-xs font-medium text-rose-300">Last sync failed</p>}
        <div className="mt-4 flex gap-2">
          <button onClick={() => onOpen(p.id)} className="btn-ghost flex-1 !px-2"><Eye className="h-4 w-4" />Review</button>
          {p.status === 'Draft' ? (
            <button onClick={() => onEnrich(p.id)} disabled={busy} className="btn-primary flex-1 !px-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Enrich
            </button>
          ) : (
            <button onClick={() => onSync(p.id)} disabled={busy} className="btn-success flex-1 !px-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {p.status === 'WooCommerce Synced' ? 'Re-sync' : 'Sync'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function ProductGrid({ products, all, filter, setFilter, query, setQuery, busy, bulkBusy, onOpen, onEnrich, onSync, onBulk }) {
  const count = (f) => (f === 'all' ? all.length : all.filter((p) => p.status === f).length);
  const drafts = count('Draft');
  return (
    <section aria-label="Product catalog">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, SKU or category"
            aria-label="Search products" className="input !pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${filter === f ? 'bg-indigo-500 text-white' : 'bg-slate-900 text-slate-400 ring-1 ring-slate-800 hover:text-slate-200'}`}>
              {f === 'all' ? 'All' : f} <span className="ml-1 opacity-70">{count(f)}</span>
            </button>
          ))}
        </div>
        <button onClick={onBulk} disabled={!drafts || bulkBusy} className="btn-primary lg:ml-auto">
          {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Enrich all drafts ({drafts})
        </button>
      </div>

      {products.length === 0 ? (
        <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-slate-800 py-20 text-center">
          <PackageOpen className="h-10 w-10 text-slate-600" />
          <p className="mt-3 font-semibold text-white">No products match</p>
          <p className="mt-1 text-sm text-slate-400">Clear the search or pick a different status, or add a new product.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => <Card key={p.id} p={p} busy={Boolean(busy[p.id])} onOpen={onOpen} onEnrich={onEnrich} onSync={onSync} />)}
        </div>
      )}
    </section>
  );
}
