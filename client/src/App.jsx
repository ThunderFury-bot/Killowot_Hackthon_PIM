import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Loader2, Sparkles, X } from 'lucide-react';
import { api } from './api';
import Navbar from './components/Navbar';
import MetricsDashboard from './components/MetricsDashboard';
import ProductGrid from './components/ProductGrid';
import ProductModal from './components/ProductModal';
import AddProductModal from './components/AddProductModal';
import SyncLogsTable from './components/SyncLogsTable';
import ToastNotification from './components/ToastNotification';
import ArchitectureModal from './components/ArchitectureModal';
import BulkImportModal from './components/BulkImportModal';

function BulkEnrichmentDrawer({ open, items, onClose }) {
  if (!open) return null;
  const total = items.length || 1;
  const completed = items.filter((item) => item.status === 'done').length;
  const percent = Math.min(100, Math.round((completed / total) * 100));

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-slate-800 bg-slate-950/95 p-5 shadow-2xl backdrop-blur-sm" aria-label="Bulk enrichment progress">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Queue</p>
          <h3 className="text-lg font-bold text-white">Bulk enrichment</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Close progress drawer" className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
      </div>

      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
          <span>Progress</span>
          <span className="font-semibold text-white">{percent}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-3 text-xs text-slate-400">Rate-limit safety: 750ms per item, retries on transient errors.</div>
      </div>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-slate-300">{item.sku}</span>
              <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-300">
                {item.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />}
                {item.status === 'retrying' && <Clock3 className="h-3.5 w-3.5 text-amber-300" />}
                {item.status === 'error' && <AlertTriangle className="h-3.5 w-3.5 text-rose-300" />}
                {item.status === 'processing' && <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-300" />}
                {item.status === 'queued' && <Sparkles className="h-3.5 w-3.5 text-slate-400" />}
                {item.status}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${item.progress}%` }} />
            </div>
            <div className="mt-2 text-xs text-slate-400">{item.error ? `Retry ${item.attempts}/2: ${item.error}` : `Attempt ${item.attempts || 0}/2`}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState(null);
  const [tab, setTab] = useState('catalog');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [architectureOpen, setArchitectureOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkDrawerOpen, setBulkDrawerOpen] = useState(false);
  const [bulkProgress, setBulkProgress] = useState([]);
  const [busy, setBusy] = useState({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((type, title, message) =>
    setToasts((t) => [...t, { id: crypto.randomUUID(), type, title, message }]), []);
  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const refresh = useCallback(async () => {
    const [p, m, l] = await Promise.all([api.products(), api.metrics(), api.logs()]);
    setProducts(p); setMetrics(m); setLogs(l);
  }, []);

  useEffect(() => {
    refresh().catch((e) => toast('error', 'Could not load catalog', e.message));
    api.status().then(setStatus).catch(() => {});
  }, [refresh, toast]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) =>
      (filter === 'all' || p.status === filter) &&
      (!q || [p.title, p.sku, p.category].some((f) => (f || '').toLowerCase().includes(q))));
  }, [products, filter, query]);

  const withBusy = async (id, kind, task) => {
    setBusy((b) => ({ ...b, [id]: kind }));
    try { return await task(); }
    finally { setBusy((b) => { const n = { ...b }; delete n[id]; return n; }); await refresh().catch(() => {}); }
  };

  const enrich = (id) => withBusy(id, 'enrich', async () => {
    try {
      const p = await api.enrich(id);
      toast('success', 'Enrichment complete', `${p.title} is ready to review.`);
    } catch (e) { toast('error', 'Enrichment failed', e.message); }
  });

  const sync = (id, patch) => withBusy(id, 'sync', async () => {
    try {
      if (patch) await api.update(id, patch);
      const p = await api.sync(id);
      toast('success', 'Synced to WooCommerce', `${p.title} is live as #${p.wc_id}.`);
    } catch (e) { toast('error', 'Sync failed', e.message); }
  });

  const save = (id, patch) => withBusy(id, 'save', async () => {
    try { await api.update(id, patch); toast('success', 'Changes saved'); }
    catch (e) { toast('error', 'Could not save', [e.message, ...(e.details || [])].join(' · ')); }
  });

  const remove = async (id) => {
    try { await api.remove(id); setOpenId(null); toast('success', 'Product deleted'); await refresh(); }
    catch (e) { toast('error', 'Could not delete', e.message); }
  };

  const create = async (data) => {
    const p = await api.create(data);
    setAdding(false); toast('success', 'Product added', `${p.title} is in your catalog as a draft.`);
    await refresh();
  };

  const bulk = async () => {
    const drafts = products.filter((p) => p.status === 'Draft');
    if (!drafts.length) {
      toast('info', 'Nothing to enrich', 'All products are already enriched or synced.');
      return;
    }

    setBulkBusy(true);
    setBulkDrawerOpen(true);
    const items = drafts.map((p) => ({
      id: p.id,
      sku: p.sku,
      status: 'queued',
      progress: 0,
      attempt: 0,
      error: null,
    }));
    setBulkProgress(items);

    try {
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        item.status = 'processing';
        item.progress = Math.round((index / items.length) * 100);
        item.attempt = 1;
        setBulkProgress([...items]);

        let attempt = 0;
        let ok = false;
        while (!ok && attempt < 2) {
          attempt += 1;
          item.attempt = attempt;
          item.status = attempt > 1 ? 'retrying' : 'processing';
          item.error = null;
          setBulkProgress([...items]);

          try {
            await api.enrich(item.id);
            ok = true;
            item.status = 'done';
            item.progress = 100;
            setBulkProgress([...items]);
          } catch (e) {
            item.error = e.message;
            if (attempt < 2) {
              item.status = 'retrying';
              setBulkProgress([...items]);
              await new Promise((resolve) => setTimeout(resolve, 900));
              continue;
            }
            item.status = 'error';
            item.progress = 100;
            setBulkProgress([...items]);
          }
        }

        if (index < items.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 750));
        }
      }

      const success = items.filter((item) => item.status === 'done').length;
      const failed = items.filter((item) => item.status === 'error').length;
      toast(failed ? 'error' : 'success', `Enriched ${success} product${success === 1 ? '' : 's'}`,
        failed ? `${failed} failed. Review the sync log for retry details.` : 'Every draft now has AI copy.');
    } catch (e) {
      toast('error', 'Bulk enrichment failed', e.message);
    } finally {
      setBulkBusy(false);
      await refresh().catch(() => {});
    }
  };

  const importProducts = async ({ mode, content }) => {
    setImporting(true);
    try {
      const payload = { mode, content };
      const r = await api.importProducts(payload);
      toast('success', 'Catalog imported', `${r.created} product${r.created === 1 ? '' : 's'} were added to the catalog.`);
      await refresh();
      return r;
    } catch (e) {
      toast('error', 'Import failed', e.message);
      throw e;
    } finally {
      setImporting(false);
    }
  };

  const open = products.find((p) => p.id === openId);

  return (
    <div className="min-h-screen">
      <Navbar tab={tab} setTab={setTab} status={status} onAdd={() => setAdding(true)} onImport={() => setImportOpen(true)} onArchitecture={() => setArchitectureOpen(true)} />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <MetricsDashboard metrics={metrics} />
        {tab === 'catalog' ? (
          <ProductGrid products={visible} all={products} filter={filter} setFilter={setFilter} query={query} setQuery={setQuery}
            busy={busy} bulkBusy={bulkBusy} onOpen={setOpenId} onEnrich={enrich} onSync={(id) => sync(id)} onBulk={bulk} />
        ) : (
          <SyncLogsTable logs={logs} />
        )}
      </main>
      {open && <ProductModal product={open} busy={busy[open.id]} onClose={() => setOpenId(null)}
        onSave={save} onEnrich={enrich} onSync={sync} onDelete={remove} />}
      {adding && <AddProductModal onClose={() => setAdding(false)} onCreate={create} />}
      {architectureOpen && <ArchitectureModal open={architectureOpen} onClose={() => setArchitectureOpen(false)} />}
      {importOpen && <BulkImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={importProducts} loading={importing} />}
      <BulkEnrichmentDrawer open={bulkDrawerOpen} items={bulkProgress} onClose={() => setBulkDrawerOpen(false)} />
      <ToastNotification toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
