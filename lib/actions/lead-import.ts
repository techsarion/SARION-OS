'use server';
// CSV Import — the critical bulk-entry feature. Two server actions:
//   previewImport  → parse headers, auto-map columns, validate rows, detect
//                    duplicates (email / company / website) against the DB and
//                    within the file itself. No writes.
//   commitImport   → insert the accepted rows in one batch, record a
//                    lead_imports batch row + timeline entries, return a report.
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { guard } from '@/lib/server/guard';
import { logLeadActivity } from '@/lib/server/leads-activity';
import { logActivity } from '@/lib/server/activity';
import { parseCsv } from '@/lib/leads/csv';
import { autoMapHeader, CSV_FIELDS } from '@/lib/leads/constants';
import { LeadStatus } from '@/types/enums';
import { ok, fail, failFrom, type ActionResult } from '@/lib/actions/result';
import type { Database } from '@/types/database.types';

type LeadInsert = Database['public']['Tables']['leads']['Insert'];

const VALID_KEYS = new Set(CSV_FIELDS.map((f) => f.key));
const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

export interface ImportPreviewRow {
  index: number;
  data: Record<string, string>;
  status: 'ok' | 'duplicate' | 'error';
  reason?: string;
}
export interface ImportPreview {
  headers: string[];
  mapping: Record<number, string | null>; // column index → lead field key
  rows: ImportPreviewRow[];
  counts: { total: number; ok: number; duplicate: number; error: number };
}

/** Parse + validate a raw CSV string. `override` lets the UI re-map columns. */
export async function previewImport(csvText: string, override?: Record<number, string | null>): Promise<ActionResult<{ preview: ImportPreview }>> {
  const g = await guard('lead:import');
  if (!g.ok) return g.error;
  try {
    const table = parseCsv(csvText);
    if (table.length < 2) return fail('The file needs a header row and at least one data row.');
    const headers = table[0].map((h) => h.trim());
    const body = table.slice(1);

    // Column → field mapping (auto, then any explicit overrides).
    const mapping: Record<number, string | null> = {};
    headers.forEach((h, i) => { mapping[i] = autoMapHeader(h); });
    if (override) for (const [k, v] of Object.entries(override)) mapping[Number(k)] = v && VALID_KEYS.has(v) ? v : null;

    const agencyCol = Object.entries(mapping).find(([, v]) => v === 'agency_name')?.[0];
    if (agencyCol == null) return fail('Map a column to "Agency Name" — it is required.');

    // Existing duplicate keys from the DB.
    const supabase = await createClient();
    const { data: existing } = await supabase.from('leads').select('business_email, agency_name, website').is('deleted_at', null);
    const exEmail = new Set<string>(), exName = new Set<string>(), exSite = new Set<string>();
    for (const r of (existing ?? []) as { business_email: string | null; agency_name: string | null; website: string | null }[]) {
      if (r.business_email) exEmail.add(norm(r.business_email));
      if (r.agency_name) exName.add(norm(r.agency_name));
      if (r.website) exSite.add(norm(r.website));
    }

    // In-file dedup sets.
    const seenEmail = new Set<string>(), seenName = new Set<string>(), seenSite = new Set<string>();
    const rows: ImportPreviewRow[] = [];
    let okCount = 0, dupCount = 0, errCount = 0;

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

      if (!agency) { status = 'error'; reason = 'Missing agency name'; }
      else {
        const email = norm(data.business_email), name = norm(agency), site = norm(data.website);
        if (email && (exEmail.has(email) || seenEmail.has(email))) { status = 'duplicate'; reason = 'Duplicate email'; }
        else if (name && (exName.has(name) || seenName.has(name))) { status = 'duplicate'; reason = 'Duplicate company'; }
        else if (site && (exSite.has(site) || seenSite.has(site))) { status = 'duplicate'; reason = 'Duplicate website'; }
        if (status === 'ok') {
          if (email) seenEmail.add(email);
          if (name) seenName.add(name);
          if (site) seenSite.add(site);
        }
      }
      if (status === 'ok') okCount++; else if (status === 'duplicate') dupCount++; else errCount++;
      rows.push({ index: idx, data, status, reason });
    });

    return ok({
      preview: {
        headers, mapping, rows,
        counts: { total: body.length, ok: okCount, duplicate: dupCount, error: errCount },
      },
    });
  } catch (err) {
    return failFrom(err);
  }
}

export interface CommitResult {
  imported: number; skipped: number; duplicates: number; errors: number; importId: string;
}

/** Insert every 'ok' row (plus any duplicates the user chose to keep). */
export async function commitImport(
  rows: ImportPreviewRow[],
  fileName: string | null,
  includeDuplicates = false,
): Promise<ActionResult<{ result: CommitResult }>> {
  const g = await guard('lead:import');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const accept = rows.filter((r) => r.status === 'ok' || (includeDuplicates && r.status === 'duplicate'));
    const skipped = rows.length - accept.length;
    const duplicates = rows.filter((r) => r.status === 'duplicate').length;
    const errors = rows.filter((r) => r.status === 'error').length;

    // Batch record first so imported leads can reference it.
    const { data: batch, error: batchErr } = await supabase.from('lead_imports').insert({
      file_name: fileName, imported_by: g.user.id, total_rows: rows.length,
      imported_rows: accept.length, skipped_rows: skipped, duplicate_rows: duplicates, error_rows: errors,
      report: { counts: { total: rows.length, imported: accept.length, skipped, duplicates, errors } } as never,
    } as never).select('id').single<{ id: string }>();
    if (batchErr || !batch) return fail(batchErr?.message ?? 'Could not record the import batch.');

    const inserts: LeadInsert[] = accept.map((r) => ({
      agency_name: r.data.agency_name,
      website: r.data.website ?? null, country: r.data.country ?? null, city: r.data.city ?? null,
      industry: r.data.industry ?? null, agency_size: r.data.agency_size ?? null, services: r.data.services ?? null,
      linkedin_company: r.data.linkedin_company ?? null, founder_name: r.data.founder_name ?? null,
      founder_linkedin: r.data.founder_linkedin ?? null, contact_person: r.data.contact_person ?? null,
      position: r.data.position ?? null, business_email: r.data.business_email ?? null, phone: r.data.phone ?? null,
      instagram: r.data.instagram ?? null, facebook: r.data.facebook ?? null, x_handle: r.data.x_handle ?? null,
      research_source: r.data.research_source ?? null,
      status: LeadStatus.IMPORTED,
      imported_by: g.user.id, created_by: g.user.id, updated_by: g.user.id, import_id: batch.id,
    }));

    let importedIds: string[] = [];
    if (inserts.length) {
      const { data: created, error } = await supabase.from('leads').insert(inserts as never).select('id');
      if (error) return fail(error.message);
      importedIds = ((created ?? []) as { id: string }[]).map((c) => c.id);
    }
    for (const id of importedIds) await logLeadActivity(id, g.user.id, 'imported', { batch: batch.id });
    await logActivity({ action: 'lead.import', resourceType: 'lead_import', resourceId: batch.id, after: { imported: importedIds.length, skipped, duplicates, errors } });

    revalidatePath('/leads');
    return ok({ result: { imported: importedIds.length, skipped, duplicates, errors, importId: batch.id } });
  } catch (err) {
    return failFrom(err);
  }
}
