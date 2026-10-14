const STYLES = {
  Draft: 'bg-slate-800 text-slate-300 ring-slate-700',
  'AI Enriched': 'bg-indigo-500/15 text-indigo-300 ring-indigo-400/30',
  'WooCommerce Synced': 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30',
  SUCCESS: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30',
  FAILED: 'bg-rose-500/15 text-rose-300 ring-rose-400/30',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STYLES[status] || STYLES.Draft}`}>
      {status}
    </span>
  );
}
