'use client';
// Client-side ingestion for the Lead Import wizard. Turns a chosen File (or a
// pasted string) into a normalized table (string[][]) — the shape the
// previewImport server action consumes. Supports .csv and .xlsx only; .xlsx is
// parsed with SheetJS, loaded lazily so it never touches the CSV-only bundle.
import { parseCsv } from './csv';

export type FileKind = 'csv' | 'xlsx';

export const ACCEPTED_EXTENSIONS = ['csv', 'xlsx'] as const;
// Explicitly rejected (spreadsheet-like) formats get a tailored message.
const REJECTED_EXTENSIONS = ['xls', 'ods', 'numbers'] as const;
export const ACCEPT_ATTR =
  '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface ParsedWorkbook {
  kind: FileKind;
  sheets: string[]; // xlsx: every worksheet name; csv: a single synthetic sheet
  /** Rows for a sheet (defaults to the first). Cells are raw; empty rows dropped. */
  getTable: (sheet?: string) => string[][];
}

export function fileExtension(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Gate a file by extension before we spend effort reading it. */
export function validateFile(file: File): { ok: true; kind: FileKind } | { ok: false; error: string } {
  const ext = fileExtension(file.name);
  if (ext === 'csv') return { ok: true, kind: 'csv' };
  if (ext === 'xlsx') return { ok: true, kind: 'xlsx' };
  if ((REJECTED_EXTENSIONS as readonly string[]).includes(ext)) {
    return {
      ok: false,
      error: `.${ext} files aren't supported. Open it in Excel and "Save As" .xlsx, or export a .csv.`,
    };
  }
  return {
    ok: false,
    error: `Unsupported file type${ext ? ` (.${ext})` : ''}. Please upload a .csv or .xlsx file.`,
  };
}

/** Drop rows that are entirely blank; coerce every cell to a trimmed string. */
function normalizeTable(rows: unknown[][]): string[][] {
  return rows
    .map((r) => r.map((c) => (c == null ? '' : String(c)).trim()))
    .filter((r) => r.some((c) => c !== ''));
}

/** Read a File to an ArrayBuffer, reporting 0–100% progress along the way. */
function readArrayBuffer(file: File, onProgress?: (pct: number) => void): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
    reader.onload = () => { onProgress?.(100); resolve(reader.result as ArrayBuffer); };
    reader.onerror = () => reject(new Error('Could not read the file. It may be corrupt or locked by another program.'));
    reader.readAsArrayBuffer(file);
  });
}

/** Parse a File into a workbook. XLSX may expose multiple sheets. */
export async function parseWorkbook(file: File, onProgress?: (pct: number) => void): Promise<ParsedWorkbook> {
  const v = validateFile(file);
  if (!v.ok) throw new Error(v.error);

  const buf = await readArrayBuffer(file, onProgress);

  if (v.kind === 'csv') {
    // Decode as UTF-8 (BOM is stripped inside parseCsv) to preserve Unicode.
    const text = new TextDecoder('utf-8').decode(buf);
    const table = parseCsv(text);
    return { kind: 'csv', sheets: ['Sheet1'], getTable: () => table };
  }

  // XLSX — hand the buffer to SheetJS. `raw:false` yields the display-formatted
  // strings (dates/numbers as shown) and preserves Unicode.
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buf, { type: 'array' });
  const sheets = wb.SheetNames.slice();
  const getTable = (sheet?: string): string[][] => {
    const name = sheet && sheets.includes(sheet) ? sheet : sheets[0];
    const ws = wb.Sheets[name];
    if (!ws) return [];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: '', blankrows: false });
    return normalizeTable(rows);
  };
  return { kind: 'xlsx', sheets, getTable };
}

/** Parse pasted CSV text (the manual fallback in the wizard). */
export function parsePastedCsv(text: string): string[][] {
  return parseCsv(text);
}
