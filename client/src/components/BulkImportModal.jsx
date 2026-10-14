import { FileDown, FileUp, Loader2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

const template = {
  products: [
    { title: 'Trailhead 28L Daypack', sku: 'BAG-TH28', price: 89, stock: 42, category: 'Bags', notes: '28L daypack; olive green; padded sleeve' },
  ],
};

export default function BulkImportModal({ open, onClose, onImport, loading }) {
  const inputRef = useRef(null);
  const [mode, setMode] = useState('json');
  const [text, setText] = useState(JSON.stringify(template, null, 2));
  const [error, setError] = useState('');

  if (!open) return null;

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setText(content);
    setError('');
    event.target.value = '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await onImport({ mode, content: text });
      onClose();
    } catch (err) {
      setError(err.message || 'Import failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-label="Import catalog" className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-300">Bulk catalog</p>
            <h2 className="text-xl font-bold text-white">Import Catalog</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close bulk import modal" className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setMode('json')} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${mode === 'json' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
              JSON
            </button>
            <button type="button" onClick={() => setMode('csv')} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${mode === 'csv' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
              CSV
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-300">Source payload</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => inputRef.current?.click()} className="btn-ghost !px-2.5 !py-2">
                  <Upload className="h-4 w-4" />Upload file
                </button>
                <button type="button" onClick={() => setText(mode === 'json' ? JSON.stringify(template, null, 2) : 'title,sku,price,stock,category,notes\nTrailhead 28L Daypack,BAG-TH28,89,42,Bags,28L daypack; olive green; padded sleeve')} className="btn-ghost !px-2.5 !py-2">
                  <FileDown className="h-4 w-4" />Template
                </button>
              </div>
            </div>
            <input ref={inputRef} type="file" accept=".json,.csv,text/csv,application/json" className="hidden" onChange={handleFile} />
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} className="input h-64 font-mono text-xs" spellCheck={false} placeholder={mode === 'json' ? '{"products": [...]}' : 'title,sku,price,stock,category,notes'} />
          </div>

          {error && <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <FileUp className="h-4 w-4" />
            Instant catalog refresh after import
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}Import
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
