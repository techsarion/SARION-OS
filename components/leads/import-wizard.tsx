'use client';
// Lead Import wizard — a SaaS-grade upload experience for CSV and XLSX. Files are
// parsed entirely in the browser (SheetJS for .xlsx) into a table that the
// previewImport / commitImport server actions consume. Steps: Upload → Map &
// preview → Done.
import { useState, useTransition, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload, FileText, FileSpreadsheet, CheckCircle2, ArrowRight, RotateCcw, X, AlertTriangle, Download } from 'lucide-react';
import { previewImport, commitImport, type ImportPreview, type CommitResult, type DuplicateMode } from '@/lib/actions/lead-import';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CSV_FIELDS } from '@/lib/leads/constants';
import { parseWorkbook, parsePastedCsv, validateFile, formatBytes, ACCEPT_ATTR, type ParsedWorkbook, type FileKind } from '@/lib/leads/parse-file';

type Step = 'upload' | 'map' | 'done';

interface FileMeta { name: string; size: number; kind: FileKind; rows: number; cols: number; }

export function ImportWizard() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState<Step>('upload');

  const workbook = useRef<ParsedWorkbook | null>(null);
  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [sheet, setSheet] = useState<string>('');
  const [table, setTable] = useState<string[][] | null>(null);

  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pasted, setPasted] = useState('');

  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [dupMode, setDupMode] = useState<DuplicateMode>('skip');
  const [result, setResult] = useState<CommitResult | null>(null);

  // Compute file stats for the chosen sheet's table.
  const applyTable = useCallback((wb: ParsedWorkbook, name: string, file: { name: string; size: number }, sheetName: string) => {
    const t = wb.getTable(sheetName);
    if (t.length < 2) { toast.error('This sheet has no data rows (needs a header + at least one row).'); return; }
    setTable(t);
    setMeta({ name, size: file.size, kind: wb.kind, rows: t.length - 1, cols: t[0].length });
  }, []);

  const ingest = useCallback((file: File) => {
    const v = validateFile(file);
    if (!v.ok) { toast.error(v.error); return; }
    setReading(true); setProgress(0);
    parseWorkbook(file, setProgress)
      .then((wb) => {
        workbook.current = wb;
        setSheets(wb.sheets);
        const first = wb.sheets[0];
        setSheet(first);
        applyTable(wb, file.name, file, first);
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Could not read the file.'))
      .finally(() => setReading(false));
  }, [applyTable]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) ingest(file);
  };

  const onSheetChange = (name: string) => {
    setSheet(name);
    if (workbook.current && meta) applyTable(workbook.current, meta.name, { name: meta.name, size: meta.size }, name);
  };

  const usePasted = () => {
    const t = parsePastedCsv(pasted);
    if (t.length < 2) { toast.error('Paste a header row and at least one data row.'); return; }
    workbook.current = { kind: 'csv', sheets: ['Sheet1'], getTable: () => t };
    setSheets(['Sheet1']); setSheet('Sheet1'); setTable(t);
    setMeta({ name: 'pasted.csv', size: new Blob([pasted]).size, kind: 'csv', rows: t.length - 1, cols: t[0].length });
  };

  const clearFile = () => {
    workbook.current = null;
    setMeta(null); setTable(null); setSheets([]); setSheet(''); setPasted(''); setProgress(0);
  };

  const runPreview = (override?: Record<number, string | null>) => {
    if (!table) return;
    start(async () => {
      const res = await previewImport(table, override);
      if (res.ok) { setPreview(res.preview); setStep('map'); }
      else toast.error(res.error);
    });
  };

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
      const res = await commitImport(preview.rows, meta?.name ?? null, dupMode);
      if (res.ok) { setResult(res.result); setStep('done'); toast.success(`Imported ${res.result.imported} leads`); router.refresh(); }
      else toast.error(res.error);
    });

  const reset = () => {
    setStep('upload'); clearFile();
    setPreview(null); setResult(null); setDupMode('skip');
  };

  const willImport = preview
    ? preview.counts.ok + (dupMode === 'import' ? preview.counts.duplicate : 0)
    : 0;

  return (
    <div className="space-y-4">
      <Stepper step={step} />

      {step === 'upload' && (
        <Card>
          <CardContent className="space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-sm border border-dashed px-6 py-10 text-center transition-colors ${dragging ? 'border-accent bg-accent/5' : 'border-border-strong bg-surface-2/40'}`}
            >
              <Upload className={`h-7 w-7 ${dragging ? 'text-accent' : 'text-text-muted'}`} />
              <span className="text-body-sm text-text">
                <label className="cursor-pointer text-accent hover:underline">
                  Click to browse
                  <input type="file" accept={ACCEPT_ATTR} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) ingest(f); e.target.value = ''; }} />
                </label>{' '}
                or drag &amp; drop
              </span>
              <span className="text-caption text-text-muted">Supports .csv and .xlsx — up to 5,000+ rows</span>
            </div>

            {/* Read progress */}
            {reading && (
              <div className="space-y-1">
                <div className="flex justify-between text-caption text-text-muted"><span>Reading file…</span><span className="tabular-nums">{progress}%</span></div>
                <div className="h-1.5 w-full overflow-hidden rounded-sm bg-surface-2"><div className="h-full rounded-sm bg-accent transition-[width]" style={{ width: `${progress}%` }} /></div>
              </div>
            )}

            {/* File preview card */}
            {meta && !reading && (
              <div className="rounded-sm border border-border bg-surface-2/50 p-3">
                <div className="flex items-start gap-3">
                  {meta.kind === 'xlsx' ? <FileSpreadsheet className="h-8 w-8 shrink-0 text-success" /> : <FileText className="h-8 w-8 shrink-0 text-accent" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm text-text" title={meta.name}>{meta.name}</p>
                    <p className="text-caption text-text-muted">{formatBytes(meta.size)} · {meta.kind.toUpperCase()}</p>
                  </div>
                  <button onClick={clearFile} className="rounded-sm p-1 text-text-muted hover:bg-white/[0.06] hover:text-text" title="Remove file"><X className="h-4 w-4" /></button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <MiniStat label="Rows" value={meta.rows} />
                  <MiniStat label="Columns" value={meta.cols} />
                  <MiniStat label="Type" text={meta.kind.toUpperCase()} />
                </div>
                {sheets.length > 1 && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-caption text-text-muted">Worksheet:</span>
                    <Select value={sheet} onChange={(e) => onSheetChange(e.target.value)} className="h-8 flex-1 text-caption">
                      {sheets.map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Paste fallback */}
            {!meta && (
              <div>
                <p className="mb-1.5 text-caption text-text-muted">…or paste CSV rows directly:</p>
                <textarea
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  placeholder="Agency Name,Founder Name,Business Email,Website,Country&#10;Acme Digital,Jane Doe,hi@acme.com,acme.com,US"
                  className="min-h-[110px] w-full rounded-sm border border-border-strong bg-surface px-3 py-2 font-mono text-caption text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                />
                {pasted.trim() && <div className="mt-2 flex justify-end"><Button variant="secondary" onClick={usePasted}>Use pasted data</Button></div>}
              </div>
            )}

            <div className="flex justify-end">
              <Button disabled={!table || pending || reading} onClick={() => runPreview()}>
                {pending ? 'Analyzing…' : <>Preview import <ArrowRight className="h-4 w-4" /></>}
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
            <Stat label="Will import" value={willImport} tone="success" />
            <Stat label="Duplicates" value={preview.counts.duplicate} tone="warning" />
            <Stat label="Errors" value={preview.counts.error} tone="danger" />
          </div>

          {/* Missing required / validation warnings */}
          {(preview.missingRequired.length > 0 || preview.counts.invalidEmail > 0 || preview.counts.invalidUrl > 0) && (
            <Card>
              <CardContent className="space-y-1.5">
                {preview.missingRequired.length > 0 && (
                  <p className="flex items-center gap-2 text-body-sm text-warning"><AlertTriangle className="h-4 w-4 shrink-0" /> Unmapped required fields: {preview.missingRequired.join(', ')}. Map them below for complete leads.</p>
                )}
                {preview.counts.invalidEmail > 0 && <p className="text-caption text-text-muted">{preview.counts.invalidEmail} row(s) have an invalid business email.</p>}
                {preview.counts.invalidUrl > 0 && <p className="text-caption text-text-muted">{preview.counts.invalidUrl} row(s) have an invalid website URL.</p>}
              </CardContent>
            </Card>
          )}

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
              <h3 className="mb-3 text-overline uppercase text-text-muted">Preview (first 10 rows)</h3>
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
                    {preview.rows.slice(0, 10).map((r) => (
                      <tr key={r.index} className={r.status === 'error' ? 'bg-danger-soft/30' : r.status === 'duplicate' ? 'bg-warning-soft/20' : ''}>
                        <td className="px-2 py-1.5 text-text-muted">{r.index + 1}</td>
                        <td className="px-2 py-1.5 text-text">{r.data.agency_name || <span className="text-danger">missing</span>}</td>
                        <td className="px-2 py-1.5 text-text-secondary">{r.data.business_email ?? '—'}</td>
                        <td className="px-2 py-1.5 text-text-secondary">{r.data.country ?? '—'}</td>
                        <td className="px-2 py-1.5">
                          <div className="flex flex-wrap gap-1">
                            {r.status === 'ok' ? <Badge tone="success">Import</Badge> : r.status === 'duplicate' ? <Badge tone="warning">{r.reason}</Badge> : <Badge tone="danger">{r.reason}</Badge>}
                            {r.warnings.map((w) => <Badge key={w} tone="neutral">{w}</Badge>)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.rows.length > 10 && <p className="mt-2 text-caption text-text-muted">…and {preview.rows.length - 10} more rows.</p>}
            </CardContent>
          </Card>

          {/* Duplicate handling */}
          {preview.counts.duplicate > 0 && (
            <Card>
              <CardContent>
                <h3 className="mb-2 text-overline uppercase text-text-muted">Duplicates ({preview.counts.duplicate})</h3>
                <div className="flex flex-wrap gap-2">
                  {(['skip', 'update', 'import'] as DuplicateMode[]).map((m) => (
                    <label key={m} className={`flex cursor-pointer items-center gap-2 rounded-sm border px-3 py-1.5 text-body-sm ${dupMode === m ? 'border-accent bg-accent/5 text-text' : 'border-border text-text-secondary'}`}>
                      <input type="radio" name="dupMode" checked={dupMode === m} onChange={() => setDupMode(m)} />
                      {m === 'skip' ? 'Skip duplicates' : m === 'update' ? 'Update existing' : 'Import anyway'}
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" /> Start over</Button>
            <Button disabled={pending || (willImport === 0 && !(dupMode === 'update' && preview.counts.duplicate > 0))} onClick={commit}>
              {pending ? 'Importing…' : dupMode === 'update' ? `Import ${willImport} · update ${preview.counts.duplicate}` : `Import ${willImport} leads`}
            </Button>
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
            <div className="mx-auto grid max-w-lg grid-cols-2 gap-2 sm:grid-cols-5">
              <Stat label="Total" value={result.total} />
              <Stat label="Imported" value={result.imported} tone="success" />
              <Stat label="Updated" value={result.updated} tone="success" />
              <Stat label="Skipped" value={result.skipped} tone="warning" />
              <Stat label="Errors" value={result.errors} tone="danger" />
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {preview && (result.errors > 0 || result.skipped > 0) && (
                <Button variant="ghost" onClick={() => downloadErrorReport(preview, dupMode)}><Download className="h-4 w-4" /> Error report (CSV)</Button>
              )}
              <Button variant="secondary" onClick={reset}><Upload className="h-4 w-4" /> Import more</Button>
              <Button onClick={() => router.push('/leads')}>Go to Leads <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Build + download a CSV of every row that did not cleanly import.
function downloadErrorReport(preview: ImportPreview, dupMode: DuplicateMode) {
  const skippedDupes = dupMode === 'skip';
  const rows = preview.rows.filter((r) => r.status === 'error' || (skippedDupes && r.status === 'duplicate') || r.warnings.length > 0);
  const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const header = ['Row', 'Agency', 'Email', 'Website', 'Issue'];
  const lines = rows.map((r) => {
    const issue = [r.reason, ...r.warnings].filter(Boolean).join('; ');
    return [String(r.index + 1), r.data.agency_name ?? '', r.data.business_email ?? '', r.data.website ?? '', issue].map(esc).join(',');
  });
  const csv = '﻿' + [header.map(esc).join(','), ...lines].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'lead-import-errors.csv';
  a.click();
  URL.revokeObjectURL(url);
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

function MiniStat({ label, value, text }: { label: string; value?: number; text?: string }) {
  return (
    <div className="rounded-sm border border-border bg-surface px-2 py-1.5 text-center">
      <div className="text-body-sm tabular-nums text-text">{text ?? value?.toLocaleString()}</div>
      <div className="text-caption text-text-muted">{label}</div>
    </div>
  );
}
