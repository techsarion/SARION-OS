'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle2, ArrowRight, RotateCcw } from 'lucide-react';
import { previewImport, commitImport, type ImportPreview, type CommitResult } from '@/lib/actions/lead-import';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CSV_FIELDS } from '@/lib/leads/constants';

type Step = 'upload' | 'map' | 'done';

export function ImportWizard() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState<Step>('upload');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [includeDupes, setIncludeDupes] = useState(false);
  const [result, setResult] = useState<CommitResult | null>(null);

  const onFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  const runPreview = (override?: Record<number, string | null>) =>
    start(async () => {
      const res = await previewImport(csvText, override);
      if (res.ok) { setPreview(res.preview); setStep('map'); }
      else toast.error(res.error);
    });

  const remap = (col: number, key: string) => {
    if (!preview) return;
    const override: Record<number, string | null> = {};
    Object.entries(preview.mapping).forEach(([k, v]) => { override[Number(k)] = v; });
    override[col] = key || null;
    runPreview(override);
  };

  const commit = () =>
    start(async () => {
      if (!preview) return;
      const res = await commitImport(preview.rows, fileName, includeDupes);
      if (res.ok) { setResult(res.result); setStep('done'); toast.success(`Imported ${res.result.imported} leads`); router.refresh(); }
      else toast.error(res.error);
    });

  const reset = () => { setStep('upload'); setCsvText(''); setFileName(null); setPreview(null); setResult(null); setIncludeDupes(false); };

  return (
    <div className="space-y-4">
      <Stepper step={step} />

      {step === 'upload' && (
        <Card>
          <CardContent className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border-strong bg-surface-2/40 px-6 py-10 text-center hover:border-accent">
              <Upload className="h-7 w-7 text-text-muted" />
              <span className="text-body-sm text-text">Click to choose a CSV file</span>
              <span className="text-caption text-text-muted">Exported from LinkedIn, Clutch, Google Sheets, or a directory</span>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
            </label>
            {fileName && <p className="flex items-center gap-2 text-caption text-text-secondary"><FileText className="h-4 w-4" /> {fileName}</p>}
            <div>
              <p className="mb-1.5 text-caption text-text-muted">…or paste CSV rows directly:</p>
              <textarea
                value={csvText}
                onChange={(e) => { setCsvText(e.target.value); if (!fileName) setFileName('pasted.csv'); }}
                placeholder="Agency Name,Website,Country,Business Email&#10;Acme Digital,acme.com,US,hi@acme.com"
                className="min-h-[120px] w-full rounded-sm border border-border-strong bg-surface px-3 py-2 font-mono text-caption text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div className="flex justify-end">
              <Button disabled={!csvText.trim() || pending} onClick={() => runPreview()}>
                {pending ? 'Reading…' : <>Preview import <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'map' && preview && (
        <div className="space-y-4">
          {/* Counts */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Total rows" value={preview.counts.total} />
            <Stat label="Will import" value={preview.counts.ok} tone="success" />
            <Stat label="Duplicates" value={preview.counts.duplicate} tone="warning" />
            <Stat label="Errors" value={preview.counts.error} tone="danger" />
          </div>

          {/* Column mapping */}
          <Card>
            <CardContent>
              <h3 className="mb-3 text-overline uppercase text-text-muted">Column mapping</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {preview.headers.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-1/2 truncate text-body-sm text-text-secondary" title={h}>{h || `Column ${i + 1}`}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                    <Select value={preview.mapping[i] ?? ''} onChange={(e) => remap(i, e.target.value)} className="h-8 flex-1 text-caption" disabled={pending}>
                      <option value="">— Ignore —</option>
                      {CSV_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Preview table */}
          <Card>
            <CardContent>
              <h3 className="mb-3 text-overline uppercase text-text-muted">Preview (first 25 rows)</h3>
              <div className="max-h-[360px] overflow-auto rounded-sm border border-border">
                <table className="w-full text-caption">
                  <thead className="sticky top-0 bg-surface-2 text-text-muted">
                    <tr>
                      <th className="px-2 py-1.5 text-left">#</th>
                      <th className="px-2 py-1.5 text-left">Agency</th>
                      <th className="px-2 py-1.5 text-left">Email</th>
                      <th className="px-2 py-1.5 text-left">Country</th>
                      <th className="px-2 py-1.5 text-left">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.rows.slice(0, 25).map((r) => (
                      <tr key={r.index} className={r.status === 'error' ? 'bg-danger-soft/30' : r.status === 'duplicate' ? 'bg-warning-soft/20' : ''}>
                        <td className="px-2 py-1.5 text-text-muted">{r.index + 1}</td>
                        <td className="px-2 py-1.5 text-text">{r.data.agency_name || <span className="text-danger">missing</span>}</td>
                        <td className="px-2 py-1.5 text-text-secondary">{r.data.business_email ?? '—'}</td>
                        <td className="px-2 py-1.5 text-text-secondary">{r.data.country ?? '—'}</td>
                        <td className="px-2 py-1.5">
                          {r.status === 'ok' ? <Badge tone="success">Import</Badge> : r.status === 'duplicate' ? <Badge tone="warning">{r.reason}</Badge> : <Badge tone="danger">{r.reason}</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.rows.length > 25 && <p className="mt-2 text-caption text-text-muted">…and {preview.rows.length - 25} more rows.</p>}
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {preview.counts.duplicate > 0 && (
              <label className="flex items-center gap-2 text-body-sm text-text-secondary">
                <input type="checkbox" checked={includeDupes} onChange={(e) => setIncludeDupes(e.target.checked)} />
                Import duplicates anyway ({preview.counts.duplicate})
              </label>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" /> Start over</Button>
              <Button disabled={pending || (preview.counts.ok === 0 && !includeDupes)} onClick={commit}>
                {pending ? 'Importing…' : `Import ${preview.counts.ok + (includeDupes ? preview.counts.duplicate : 0)} leads`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <Card>
          <CardContent className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
            <div>
              <h3 className="text-h3">Import complete</h3>
              <p className="text-body-sm text-text-secondary">Your leads are now in the pipeline as “Imported”.</p>
            </div>
            <div className="mx-auto grid max-w-md grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Imported" value={result.imported} tone="success" />
              <Stat label="Skipped" value={result.skipped} />
              <Stat label="Duplicates" value={result.duplicates} tone="warning" />
              <Stat label="Errors" value={result.errors} tone="danger" />
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="secondary" onClick={reset}><Upload className="h-4 w-4" /> Import more</Button>
              <Button onClick={() => router.push('/leads')}>Go to Leads <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'upload', label: 'Upload' }, { key: 'map', label: 'Map & preview' }, { key: 'done', label: 'Done' },
  ];
  const idx = steps.findIndex((s) => s.key === step);
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <span className={`grid h-6 w-6 place-items-center rounded-full text-caption font-medium ${i <= idx ? 'bg-accent text-accent-fg' : 'bg-white/[0.06] text-text-muted'}`}>{i + 1}</span>
          <span className={`text-body-sm ${i <= idx ? 'text-text' : 'text-text-muted'}`}>{s.label}</span>
          {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'warning' | 'danger' }) {
  const color = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : tone === 'danger' ? 'text-danger' : 'text-text';
  return (
    <div className="rounded-sm border border-border bg-surface-2/50 px-3 py-2 text-center">
      <div className={`text-h3 tabular-nums ${color}`}>{value}</div>
      <div className="text-caption text-text-muted">{label}</div>
    </div>
  );
}
