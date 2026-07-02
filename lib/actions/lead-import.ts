'use server';
// Lead Import — the critical bulk-entry feature, shared by CSV and XLSX uploads.
// The wizard parses either format into a table (string[][]) client-side, so both
// paths converge on the same two server actions:
//   previewImport  → auto-map columns, validate rows (required fields, emails,
//                    URLs), detect duplicates (email / company / website) against
//                    the DB and within the file itself. No writes.
//   commitImport   → apply the accepted rows (skip / update / insert duplicates),
//                    record a lead_imports batch + timeline entries, return a
//                    report the UI turns into a downloadable error CSV.
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { guard } from '@/lib/server/guard';
import { logLeadActivity } from '@/lib/server/leads-activity';
import { logActivity } from '@/lib/server/activity';
import { autoMapHeader, CSV_FIELDS } from '@/lib/leads/constants';
import { isValidEmail, isValidUrl } from '@/lib/leads/validate';
import { LeadStatus } from '@/types/enums';
import { ok, fail, failFrom, type ActionResult } from '@/lib/actions/result';
import type { Database } from '@/types/database.types';

type LeadInsert = Database['public']['Tables']['leads']['Insert'];
type LeadUpdate = Database['public']['Tables']['leads']['Update'];

const VALID_KEYS = new Set(CSV_FIELDS.map((f) => f.key));
const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

export type DuplicateMode = 'skip' | 'update' | 'import';

export interface ImportPreviewRow {
  index: number;
  data: Record<string, string>;
  status: 'ok' | 'duplicate' | 'error';
  reason?: string;
  warnings: string[]; // non-blocking: invalid email / invalid URL
  matchId?: string; // existing lead id, when this row duplicates a DB record
}
export interface ImportPreview {
  headers: string[];
  mapping: Record<number, string | null>; // column index → lead field key
  missingRequired: string[]; // required field labels not mapped to any column
  rows: ImportPreviewRow[];
  counts: {
    total: number;
    ok: number;
    duplicate: number;
    error: number;
    invalidEmail: number;
    invalidUrl: number;
  };
}

// Fields the team treats as required for a usable lead. agency_name is the only
// hard gate (a row without it is an error); the rest surface as "missing column"
// hints in the mapper but never block the import.
const REQUIRED_KEYS = ['agency_name', 'founder_name', 'business_email', 'website', 'country'] as const;

/** Parse + validate a table (from CSV or XLSX). `override` lets the UI re-map columns. */
export async function previewImport(
  table: string[][],
  override?: Record<number, string | null>,
): Promise<ActionResult<{ preview: ImportPreview }>> {
  const g = await guard('lead:import');
  if (!g.ok) return g.error;
  try {
    if (!table || table.length < 2) return fail('The file needs a header row and at least one data row.');
    const headers = table[0].map((h) => h.trim());
    const body = table.slice(1);

    // Column → field mapping (auto, then any explicit overrides).
    const mapping: Record<number, string | null> = {};
    headers.forEach((h, i) => { mapping[i] = autoMapHeader(h); });
    if (override) for (const [k, v] of Object.entries(override)) mapping[Number(k)] = v && VALID_KEYS.has(v) ? v : null;

    const mapped = new Set(Object.values(mapping).filter(Boolean) as string[]);
    const agencyCol = Object.entries(mapping).find(([, v]) => v === 'agency_name')?.[0];
    if (agencyCol == null) return fail('Map a column to "Agency Name" — it is required.');

    const missingRequired = REQUIRED_KEYS
      .filter((k) => !mapped.has(k))
      .map((k) => CSV_FIELDS.find((f) => f.key === k)?.label ?? k);

    // Existing duplicate keys from the DB, each pointing back at its lead id so
    // "Update existing" can target the right record.
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from('leads')
      .select('id, business_email, agency_name, website')
      .is('deleted_at', null);
    const exEmail = new Map<string, string>(), exName = new Map<string, string>(), exSite = new Map<string, string>();
    for (const r of (existing ?? []) as { id: string; business_email: string | null; agency_name: string | null; website: string | null }[]) {
      if (r.business_email) exEmail.set(norm(r.business_email), r.id);
      if (r.agency_name) exName.set(norm(r.agency_name), r.id);
      if (r.website) exSite.set(norm(r.website), r.id);
    }

    // In-file dedup sets.
    const seenEmail = new Set<string>(), seenName = new Set<string>(), seenSite = new Set<string>();
    const rows: ImportPreviewRow[] = [];
    let okCount = 0, dupCount = 0, errCount = 0, invalidEmail = 0, invalidUrl = 0;

    body.forEach((cells, idx) => {
      const data: Record<string, string> = {};
      for (const [colStr, key] of Object.entries(mapping)) {
        if (!key) continue;
        const val = (cells[Number(colStr)] ?? '').trim();
        if (val) data[key] = val;
      }
      const agency = data.agency_name?.trim();
      let status: ImportPreviewRow['status'] = 'ok';
      let reason: string | undefined;
      let matchId: string | undefined;
      const warnings: string[] = [];

      // Format warnings (non-blocking) — counted for the preview summary.
      if (data.business_email && !isValidEmail(data.business_email)) { warnings.push('Invalid email'); invalidEmail++; }
      if (data.website && !isValidUrl(data.website)) { warnings.push('Invalid website URL'); invalidUrl++; }

      if (!agency) { status = 'error'; reason = 'Missing agency name'; }
      else {
        const email = norm(data.business_email), name = norm(agency), site = norm(data.website);
        if (email && (exEmail.has(email) || seenEmail.has(email))) { status = 'duplicate'; reason = 'Duplicate email'; matchId = exEmail.get(email); }
        else if (name && (exName.has(name) || seenName.has(name))) { status = 'duplicate'; reason = 'Duplicate company'; matchId = exName.get(name); }
        else if (site && (exSite.has(site) || seenSite.has(site))) { status = 'duplicate'; reason = 'Duplicate website'; matchId = exSite.get(site); }
        if (status === 'ok') {
          if (email) seenEmail.add(email);
          if (name) seenName.add(name);
          if (site) seenSite.add(site);
        }
      }
      if (status === 'ok') okCount++; else if (status === 'duplicate') dupCount++; else errCount++;
      rows.push({ index: idx, data, status, reason, warnings, matchId });
    });

    return ok({
      preview: {
        headers, mapping, missingRequired, rows,
        counts: { total: body.length, ok: okCount, duplicate: dupCount, error: errCount, invalidEmail, invalidUrl },
      },
    });
  } catch (err) {
    return failFrom(err);
  }
}

export interface CommitResult {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  duplicates: number;
  errors: number;
  importId: string;
}

// Map a preview row's collected data onto a leads row payload.
function toLeadFields(data: Record<string, string>) {
  return {
    agency_name: data.agency_name,
    website: data.website ?? null, country: data.country ?? null, city: data.city ?? null,
    industry: data.industry ?? null, agency_size: data.agency_size ?? null, services: data.services ?? null,
    linkedin_company: data.linkedin_company ?? null, founder_name: data.founder_name ?? null,
    founder_linkedin: data.founder_linkedin ?? null, contact_person: data.contact_person ?? null,
    position: data.position ?? null, business_email: data.business_email ?? null, phone: data.phone ?? null,
    instagram: data.instagram ?? null, facebook: data.facebook ?? null, x_handle: data.x_handle ?? null,
    research_source: data.research_source ?? null,
  };
}

/**
 * Apply the preview: always insert 'ok' rows. Duplicates are handled per
 * `dupMode` — 'skip' (default), 'update' the matched lead, or 'import' as new.
 */
export async function commitImport(
  rows: ImportPreviewRow[],
  fileName: string | null,
  dupMode: DuplicateMode = 'skip',
): Promise<ActionResult<{ result: CommitResult }>> {
  const g = await guard('lead:import');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();

    const okRows = rows.filter((r) => r.status === 'ok');
    const dupRows = rows.filter((r) => r.status === 'duplicate');
    const errors = rows.filter((r) => r.status === 'error').length;

    // Rows to insert as new leads.
    const toInsert = [...okRows, ...(dupMode === 'import' ? dupRows : [])];
    // Duplicates to update in place (only those with a resolved match id).
    const toUpdate = dupMode === 'update' ? dupRows.filter((r) => r.matchId) : [];
    const skipped = rows.length - toInsert.length - toUpdate.length;

    // Batch record first so imported leads can reference it.
    const { data: batch, error: batchErr } = await supabase.from('lead_imports').insert({
      file_name: fileName, imported_by: g.user.id, total_rows: rows.length,
      imported_rows: toInsert.length, skipped_rows: skipped, duplicate_rows: dupRows.length, error_rows: errors,
      report: { counts: { total: rows.length, imported: toInsert.length, updated: toUpdate.length, skipped, duplicates: dupRows.length, errors }, dupMode } as never,
    } as never).select('id').single<{ id: string }>();
    if (batchErr || !batch) return fail(batchErr?.message ?? 'Could not record the import batch.');

    const inserts: LeadInsert[] = toInsert.map((r) => ({
      ...toLeadFields(r.data),
      status: LeadStatus.IMPORTED,
      imported_by: g.user.id, created_by: g.user.id, updated_by: g.user.id, import_id: batch.id,
    }));

    let importedIds: string[] = [];
    if (inserts.length) {
      const { data: created, error } = await supabase.from('leads').insert(inserts as never).select('id');
      if (error) return fail(error.message);
      importedIds = ((created ?? []) as { id: string }[]).map((c) => c.id);
    }

    // Update matched duplicates. Only overwrite fields the import actually
    // provided, so an update never wipes existing data with blanks.
    let updatedCount = 0;
    for (const r of toUpdate) {
      const fields = toLeadFields(r.data);
      const patch: Record<string, unknown> = { updated_by: g.user.id };
      for (const [k, v] of Object.entries(fields)) if (v != null && v !== '') patch[k] = v;
      const { error } = await supabase.from('leads').update(patch as LeadUpdate as never).eq('id', r.matchId!);
      if (!error) { updatedCount++; await logLeadActivity(r.matchId!, g.user.id, 'imported', { batch: batch.id, updated: true }); }
    }

    for (const id of importedIds) await logLeadActivity(id, g.user.id, 'imported', { batch: batch.id });
    await logActivity({ action: 'lead.import', resourceType: 'lead_import', resourceId: batch.id, after: { imported: importedIds.length, updated: updatedCount, skipped, duplicates: dupRows.length, errors } });

    revalidatePath('/leads');
    return ok({
      result: {
        total: rows.length, imported: importedIds.length, updated: updatedCount,
        skipped, duplicates: dupRows.length, errors, importId: batch.id,
      },
    });
  } catch (err) {
    return failFrom(err);
  }
}
