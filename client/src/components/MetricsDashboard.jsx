const Stat = ({ label, value, tone = 'text-white', hint }) => (
  <div className="px-5 py-4">
    <p className="text-sm text-slate-400">{label}</p>
    <p className={`mt-1 text-3xl font-extrabold tabular-nums ${tone}`}>{value}</p>
    {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
  </div>
);

export default function MetricsDashboard({ metrics }) {
  const m = metrics || { total: 0, drafts: 0, enriched: 0, synced: 0, aiEnriched: 0, syncFailures: 0 };
  const pct = (n) => (m.total ? (n / m.total) * 100 : 0);
  return (
    <section aria-label="Catalog metrics" className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="grid grid-cols-2 divide-x divide-y divide-slate-800 lg:grid-cols-4 lg:divide-y-0">
        <Stat label="Total items" value={m.total} hint={`${m.drafts} still in draft`} />
        <Stat label="AI enriched" value={m.aiEnriched} tone="text-indigo-300" hint="With generated copy" />
        <Stat label="Live in WooCommerce" value={m.synced} tone="text-emerald-300" hint="Synced and up to date" />
        <Stat label="Sync failures" value={m.syncFailures} tone={m.syncFailures ? 'text-rose-300' : 'text-slate-300'}
          hint={m.syncFailures ? 'Check the sync log' : 'No failed syncs'} />
      </div>
      <div className="flex h-1.5 bg-slate-800" role="img" aria-label="Pipeline progress">
        <div className="bg-emerald-400 transition-all" style={{ width: `${pct(m.synced)}%` }} />
        <div className="bg-indigo-500 transition-all" style={{ width: `${pct(m.enriched)}%` }} />
      </div>
    </section>
  );
}
