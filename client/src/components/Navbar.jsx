import { Boxes, DatabaseZap, Plus, UploadCloud, Workflow } from 'lucide-react';

const Pill = ({ label, value }) => {
  const live = value === 'live';
  return (
    <span className="hidden items-center gap-2 rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-400 md:inline-flex">
      <span className={`h-2 w-2 rounded-full ${live ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      {label}: <span className="font-semibold text-slate-200">{value}</span>
    </span>
  );
};

export default function Navbar({ tab, setTab, status, onAdd, onImport, onArchitecture }) {
  const tabs = [['catalog', 'Catalog'], ['logs', 'Sync log']];
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-500"><Boxes className="h-5 w-5 text-white" /></span>
          <span className="text-lg font-extrabold tracking-tight text-white">Catalog Desk</span>
        </div>
        <nav className="flex gap-1">
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${tab === id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {status && <><Pill label="Gemini" value={status.gemini} /><Pill label="WooCommerce" value={status.woocommerce} /></>}
          <button type="button" onClick={onArchitecture} className="btn-ghost !px-2.5">
            <Workflow className="h-4 w-4" />Architecture & Specs
          </button>
          <button type="button" onClick={onImport} className="btn-ghost !px-2.5">
            <DatabaseZap className="h-4 w-4" />Import Catalog
          </button>
          <button onClick={onAdd} className="btn-primary"><Plus className="h-4 w-4" />Add product</button>
        </div>
      </div>
    </header>
  );
}
