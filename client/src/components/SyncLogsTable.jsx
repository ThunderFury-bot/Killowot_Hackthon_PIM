import { ScrollText } from 'lucide-react';
import StatusBadge from './StatusBadge';

const ACTIONS = { PUSH: 'Sync to store', ENRICH: 'AI enrichment', STOCK: 'Stock update', PULL: 'Stock pull' };

export default function SyncLogsTable({ logs }) {
  if (!logs.length) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-slate-800 py-20 text-center">
        <ScrollText className="h-10 w-10 text-slate-600" />
        <p className="mt-3 font-semibold text-white">No activity yet</p>
        <p className="mt-1 text-sm text-slate-400">Enrich or sync a product and each attempt will be recorded here.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-slate-800 text-slate-400">
          <tr>{['Time', 'SKU', 'Action', 'Result', 'HTTP', 'Details'].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {logs.map((l) => (
            <tr key={l.id} className="align-top">
              <td className="whitespace-nowrap px-4 py-3 text-slate-400">{new Date(l.timestamp).toLocaleTimeString()}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-200">{l.sku}</td>
              <td className="px-4 py-3">{ACTIONS[l.action] || l.action}</td>
              <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
              <td className="px-4 py-3 font-mono text-xs text-slate-400">{l.httpStatus ?? '–'}</td>
              <td className="px-4 py-3 text-slate-300">
                {l.message}
                {l.error && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-rose-300">Error details</summary>
                    <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-2 font-mono text-xs text-rose-200">{l.error}</pre>
                  </details>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
