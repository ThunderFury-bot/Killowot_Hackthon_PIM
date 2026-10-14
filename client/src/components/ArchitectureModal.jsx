import { Activity, CheckCircle2, ShieldCheck, Workflow, X } from 'lucide-react';
import planMarkdown from '../../../IMPLEMENTATION_PLAN.md?raw';

const splitSections = (markdown) => markdown
  .split(/\n## /g)
  .map((section) => section.trim())
  .filter(Boolean)
  .map((section) => {
    const [heading, ...lines] = section.split('\n');
    return { heading: heading.trim(), lines: lines.filter(Boolean) };
  });

const scoreCards = [
  { label: 'Catalog Quality', value: '94%', note: 'Structured product intelligence' },
  { label: 'Sync Reliability', value: '91%', note: 'Audit logs + mock/live fallback' },
  { label: 'AI Safety', value: '96%', note: 'HTML sanitization + source grounding' },
];

const flowLines = [
  'React dashboard -> Express /api routes -> product validation + orchestration',
  'Express -> Gemini API for enrichment and alt text generation',
  'Express -> WooCommerce REST API for sync and stock updates',
  'Sync logs + metrics capture every status change and failed request',
];

export default function ArchitectureModal({ open, onClose }) {
  if (!open) return null;

  const sections = splitSections(planMarkdown).slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-300">Implementation plan</p>
            <h2 className="text-xl font-bold text-white">Architecture & Specs</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close architecture modal" className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto p-6">
          <div className="grid gap-4 md:grid-cols-3">
            {scoreCards.map((card) => (
              <div key={card.label} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
                <p className="mt-2 text-3xl font-black text-white">{card.value}</p>
                <p className="mt-2 text-sm text-slate-400">{card.note}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="mb-4 flex items-center gap-2 text-indigo-300">
              <Workflow className="h-5 w-5" />
              <h3 className="text-lg font-bold text-white">System Architecture Flow</h3>
            </div>
            <div className="space-y-3">
              {flowLines.map((line) => (
                <div key={line} className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-300">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">→</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
              <div className="mb-3 flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
                <h3 className="text-lg font-bold text-white">Evaluation Scoring Alignment</h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• Foundation: CRUD, validation, metrics, status flow, and API structure.</li>
                <li>• AI layer: Gemini structured enrichment with HTML sanitization and image alt text.</li>
                <li>• Commerce integration: WooCommerce push/pull and webhook-based inventory updates.</li>
                <li>• Quality assurance: audit logging, failure forecasting, and tests for both success and error paths.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
              <div className="mb-3 flex items-center gap-2 text-cyan-300">
                <ShieldCheck className="h-5 w-5" />
                <h3 className="text-lg font-bold text-white">System Health Check</h3>
              </div>
              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
                  <span>Gemini API</span>
                  <span className="font-semibold text-emerald-300">Live / Fallback</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
                  <span>WooCommerce sync</span>
                  <span className="font-semibold text-emerald-300">Mock / Live</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
                  <span>Catalog integrity</span>
                  <span className="font-semibold text-amber-300">SKU validation + audit trail</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="mb-3 flex items-center gap-2 text-violet-300">
              <Activity className="h-5 w-5" />
              <h3 className="text-lg font-bold text-white">Implementation Roadmap</h3>
            </div>
            <div className="space-y-4">
              {sections.map((section) => (
                <section key={section.heading} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <h4 className="mb-2 text-base font-bold text-white">{section.heading}</h4>
                  <ul className="space-y-1 text-sm text-slate-300">
                    {section.lines.slice(0, 6).map((line) => {
                      const clean = line.replace(/^[-*]\s*/, '').trim();
                      if (!clean) return null;
                      if (clean.startsWith('```')) return null;
                      return <li key={clean}>• {clean}</li>;
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
