/*
 * Lead Import test harness — exercises the pure import logic (no DB/browser)
 * against the production testing checklist. Run: `npm run test:import`.
 *
 * Covers: CSV parse, XLSX parse (via SheetJS, mirroring parse-file.ts), large
 * XLSX, empty XLSX, multiple sheets, Unicode, long text, missing/auto-mapped
 * columns, duplicate detection, email/URL validation, and corrupt-file handling.
 */
import * as XLSX from 'xlsx';
import { parseCsv } from '../lib/leads/csv';
import { autoMapHeader } from '../lib/leads/constants';
import { isValidEmail, isValidUrl } from '../lib/leads/validate';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ ${name}`); }
}

// Mirror parse-file.ts normalizeTable (that module is 'use client' / browser-only).
function normalize(rows: unknown[][]): string[][] {
  return rows.map((r) => r.map((c) => (c == null ? '' : String(c)).trim())).filter((r) => r.some((c) => c !== ''));
}
function xlsxToTable(buf: ArrayBuffer, sheet?: string): { sheets: string[]; table: string[][] } {
  const wb = XLSX.read(buf, { type: 'array' });
  const name = sheet && wb.SheetNames.includes(sheet) ? sheet : wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: false, defval: '', blankrows: false });
  return { sheets: wb.SheetNames, table: normalize(rows) };
}
function makeXlsx(sheets: Record<string, unknown[][]>): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  for (const [n, aoa] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), n);
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

// Replicate the preview dedup + validation loop (server logic, sans DB).
function analyze(table: string[][]) {
  const headers = table[0];
  const mapping = headers.map((h) => autoMapHeader(h));
  const norm = (s: string) => (s ?? '').trim().toLowerCase();
  const seenEmail = new Set<string>(), seenName = new Set<string>(), seenSite = new Set<string>();
  let ok = 0, dup = 0, err = 0, badEmail = 0, badUrl = 0;
  for (const cells of table.slice(1)) {
    const data: Record<string, string> = {};
    mapping.forEach((k, i) => { if (k && (cells[i] ?? '').trim()) data[k] = cells[i].trim(); });
    if (data.business_email && !isValidEmail(data.business_email)) badEmail++;
    if (data.website && !isValidUrl(data.website)) badUrl++;
    const agency = data.agency_name;
    if (!agency) { err++; continue; }
    const email = norm(data.business_email), name = norm(agency), site = norm(data.website);
    if (email && seenEmail.has(email)) dup++;
    else if (name && seenName.has(name)) dup++;
    else if (site && seenSite.has(site)) dup++;
    else { ok++; if (email) seenEmail.add(email); if (name) seenName.add(name); if (site) seenSite.add(site); }
  }
  return { mapping, counts: { ok, dup, err, badEmail, badUrl } };
}

console.log('\nCSV import');
{
  const t = parseCsv('Agency Name,Business Email,Website,Country\nAcme,hi@acme.com,acme.com,US\n"Quoted, Inc","q@x.io",x.io,UK');
  check('parses header + 2 rows', t.length === 3);
  check('handles quoted comma', t[2][0] === 'Quoted, Inc');
  check('auto-maps headers', JSON.stringify(analyze(t).mapping) === JSON.stringify(['agency_name', 'business_email', 'website', 'country']));
}

console.log('\nXLSX import');
{
  const buf = makeXlsx({ Leads: [['Agency','Email','Website'], ['Acme', 'hi@acme.com', 'acme.com']] });
  const { table } = xlsxToTable(buf);
  check('reads first worksheet', table.length === 2 && table[1][0] === 'Acme');
  check('auto-maps aliased headers (Agency/Email)', analyze(table).mapping[0] === 'agency_name' && analyze(table).mapping[1] === 'business_email');
}

console.log('\nMultiple sheets');
{
  const buf = makeXlsx({ First: [['Agency'], ['A']], Second: [['Agency'], ['B'], ['C']] });
  const wbSheets = xlsxToTable(buf).sheets;
  check('lists all sheet names', JSON.stringify(wbSheets) === JSON.stringify(['First', 'Second']));
  check('defaults to first sheet', xlsxToTable(buf).table.length === 2);
  check('can select a named sheet', xlsxToTable(buf, 'Second').table.length === 3);
}

console.log('\nUnicode + long text');
{
  const long = 'x'.repeat(5000);
  const buf = makeXlsx({ S: [['Agency Name', 'Notes'], ['Café Münchén 日本', long]] });
  const { table } = xlsxToTable(buf);
  check('preserves Unicode', table[1][0] === 'Café Münchén 日本');
  check('preserves long text', table[1][1].length === 5000);
}

console.log('\nEmpty rows + empty XLSX');
{
  const buf = makeXlsx({ S: [['Agency'], ['A'], ['', ''], ['   '], ['B']] });
  check('drops blank/whitespace rows', xlsxToTable(buf).table.length === 3);
  const empty = makeXlsx({ S: [] });
  check('empty sheet yields <2 rows (rejected upstream)', xlsxToTable(empty).table.length < 2);
}

console.log('\nLarge XLSX (5,000 rows)');
{
  const aoa: unknown[][] = [['Agency Name', 'Business Email', 'Website']];
  for (let i = 0; i < 5000; i++) aoa.push([`Agency ${i}`, `lead${i}@ex.com`, `ex${i}.com`]);
  const buf = makeXlsx({ S: aoa });
  const { table } = xlsxToTable(buf);
  check('parses 5,000 data rows', table.length === 5001);
  const { counts } = analyze(table);
  check('all 5,000 unique rows import-ready', counts.ok === 5000 && counts.dup === 0);
}

console.log('\nDuplicate detection');
{
  const t = parseCsv([
    'Agency Name,Business Email,Website',
    'Acme,hi@acme.com,acme.com',
    'Acme Dup,hi@acme.com,other.com',   // dup email
    'Acme,new@x.com,new.com',            // dup company
    'Fresh,f@f.com,acme.com',            // dup website
    'Unique,u@u.com,u.com',
  ].join('\n'));
  const { counts } = analyze(t);
  check('flags 3 duplicates', counts.dup === 3);
  check('keeps 2 unique', counts.ok === 2);
}

console.log('\nMissing columns + validation');
{
  const t = parseCsv([
    'Business Email,Website',      // no Agency Name column
    'not-an-email,acme.com',
    'ok@x.com,http://good.io',
  ].join('\n'));
  const { mapping, counts } = analyze(t);
  check('no agency_name mapping when column absent', !mapping.includes('agency_name'));
  check('every row errors without agency name', counts.err === 2);
  check('detects invalid email', counts.badEmail === 1);
  check('accepts bare domain + full URL', counts.badUrl === 0);
  check('isValidEmail basic', isValidEmail('a@b.com') && !isValidEmail('a@b') && !isValidEmail('nope'));
  check('isValidUrl basic', isValidUrl('acme.com') && isValidUrl('https://x.io/p') && !isValidUrl('localhost') && !isValidUrl('has space.com'));
}

console.log('\nCorrupt file');
{
  // SheetJS is lenient — a garbage buffer either throws or yields no usable
  // rows. Either way the wizard's "needs a header + data row" guard rejects it.
  let usable = true;
  try {
    const { table } = xlsxToTable(new TextEncoder().encode('this is not a real xlsx file').buffer);
    usable = table.length >= 2;
  } catch { usable = false; }
  check('corrupt buffer produces no importable table', !usable);
}

console.log(`\n${failed === 0 ? '✅' : '❌'} ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
