// Lead pipeline metadata + CSV mapping. Pure constants — safe to import in both
// Server Actions and Client Components. Mirrors lib/tasks/constants.ts.
import { LeadStatus, LeadPriority, FollowupType } from '@/types/enums';
import type { LeadStatus as LeadStatusT, LeadPriority as LeadPriorityT, FollowupType as FollowupTypeT } from '@/types/enums';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

// Ordered outbound pipeline — matches how the Sarion team actually works.
export const STATUS_ORDER: LeadStatusT[] = [
  LeadStatus.RESEARCH,
  LeadStatus.IMPORTED,
  LeadStatus.ASSIGNED,
  LeadStatus.LINKEDIN_REQUESTED,
  LeadStatus.CONNECTED,
  LeadStatus.COLD_EMAIL_SENT,
  LeadStatus.SOCIAL_DM_SENT,
  LeadStatus.CONVERSATION_STARTED,
  LeadStatus.FOLLOWUP_SCHEDULED,
  LeadStatus.INTERESTED,
  LeadStatus.DEMO_SCHEDULED,
  LeadStatus.DEMO_COMPLETED,
  LeadStatus.PROPOSAL_SENT,
  LeadStatus.NEGOTIATION,
  LeadStatus.WON,
  LeadStatus.LOST,
  LeadStatus.ARCHIVED,
];

export const STATUS_META: Record<LeadStatusT, { label: string; tone: Tone; short: string }> = {
  RESEARCH: { label: 'Research', tone: 'neutral', short: 'Research' },
  IMPORTED: { label: 'Imported', tone: 'neutral', short: 'Imported' },
  ASSIGNED: { label: 'Assigned', tone: 'info', short: 'Assigned' },
  LINKEDIN_REQUESTED: { label: 'LinkedIn Requested', tone: 'info', short: 'LI Requested' },
  CONNECTED: { label: 'Connected', tone: 'accent', short: 'Connected' },
  COLD_EMAIL_SENT: { label: 'Cold Email Sent', tone: 'accent', short: 'Emailed' },
  SOCIAL_DM_SENT: { label: 'Social DM Sent', tone: 'accent', short: 'DM Sent' },
  CONVERSATION_STARTED: { label: 'Conversation Started', tone: 'accent', short: 'In Convo' },
  FOLLOWUP_SCHEDULED: { label: 'Follow-up Scheduled', tone: 'warning', short: 'Follow-up' },
  INTERESTED: { label: 'Interested', tone: 'success', short: 'Interested' },
  DEMO_SCHEDULED: { label: 'Demo Scheduled', tone: 'success', short: 'Demo Set' },
  DEMO_COMPLETED: { label: 'Demo Completed', tone: 'success', short: 'Demo Done' },
  PROPOSAL_SENT: { label: 'Proposal Sent', tone: 'warning', short: 'Proposal' },
  NEGOTIATION: { label: 'Negotiation', tone: 'warning', short: 'Negotiation' },
  WON: { label: 'Won', tone: 'success', short: 'Won' },
  LOST: { label: 'Lost', tone: 'danger', short: 'Lost' },
  ARCHIVED: { label: 'Archived', tone: 'neutral', short: 'Archived' },
};

export function statusLabel(s: LeadStatusT): string {
  return STATUS_META[s]?.label ?? s;
}

// Stages that count as "active" pipeline (not terminal / archived).
export const OPEN_STATUSES: LeadStatusT[] = STATUS_ORDER.filter(
  (s) => s !== LeadStatus.WON && s !== LeadStatus.LOST && s !== LeadStatus.ARCHIVED,
);

export const PRIORITY_ORDER: LeadPriorityT[] = [LeadPriority.HIGH, LeadPriority.MEDIUM, LeadPriority.LOW];

export const PRIORITY_META: Record<LeadPriorityT, { label: string; tone: Tone }> = {
  HIGH: { label: 'High', tone: 'danger' },
  MEDIUM: { label: 'Medium', tone: 'warning' },
  LOW: { label: 'Low', tone: 'neutral' },
};

export const FOLLOWUP_ORDER: FollowupTypeT[] = [
  FollowupType.LINKEDIN, FollowupType.EMAIL, FollowupType.CALL,
  FollowupType.INSTAGRAM, FollowupType.FACEBOOK, FollowupType.X, FollowupType.CUSTOM,
];

export const FOLLOWUP_META: Record<FollowupTypeT, { label: string; icon: string }> = {
  LINKEDIN: { label: 'LinkedIn', icon: 'linkedin' },
  EMAIL: { label: 'Email', icon: 'mail' },
  CALL: { label: 'Call', icon: 'phone' },
  INSTAGRAM: { label: 'Instagram', icon: 'instagram' },
  FACEBOOK: { label: 'Facebook', icon: 'facebook' },
  X: { label: 'X (Twitter)', icon: 'twitter' },
  CUSTOM: { label: 'Custom', icon: 'bell' },
};

export const RESEARCH_SOURCES = ['LinkedIn', 'Google', 'Clutch', 'Agency Directory', 'Referral', 'Other'] as const;

// ───────────── CSV import: canonical fields + header aliases ─────────────
// Each importable lead field, with the header spellings we auto-detect. Matching
// is case-insensitive and ignores spaces / underscores / punctuation.
export interface CsvField {
  key: string;         // leads column
  label: string;       // friendly name shown in the mapper
  aliases: string[];   // header variants that auto-map to this field
}

export const CSV_FIELDS: CsvField[] = [
  { key: 'agency_name', label: 'Agency Name', aliases: ['agency', 'agencyname', 'company', 'companyname', 'name', 'business'] },
  { key: 'website', label: 'Website', aliases: ['website', 'url', 'site', 'web', 'domain'] },
  { key: 'country', label: 'Country', aliases: ['country'] },
  { key: 'city', label: 'City', aliases: ['city', 'town'] },
  { key: 'industry', label: 'Industry', aliases: ['industry', 'niche', 'sector'] },
  { key: 'agency_size', label: 'Agency Size', aliases: ['agencysize', 'size', 'employees', 'headcount', 'teamsize'] },
  { key: 'services', label: 'Services', aliases: ['services', 'service', 'offerings'] },
  { key: 'linkedin_company', label: 'LinkedIn Company', aliases: ['linkedincompany', 'companylinkedin', 'linkedin'] },
  { key: 'founder_name', label: 'Founder Name', aliases: ['foundername', 'founder', 'ceo', 'owner'] },
  { key: 'founder_linkedin', label: 'Founder LinkedIn', aliases: ['founderlinkedin', 'ceolinkedin'] },
  { key: 'contact_person', label: 'Contact Person', aliases: ['contactperson', 'contact', 'contactname', 'person'] },
  { key: 'position', label: 'Position', aliases: ['position', 'title', 'jobtitle', 'role'] },
  { key: 'business_email', label: 'Business Email', aliases: ['businessemail', 'email', 'emailaddress', 'mail', 'workemail'] },
  { key: 'phone', label: 'Phone', aliases: ['phone', 'phonenumber', 'mobile', 'tel', 'contactnumber'] },
  { key: 'instagram', label: 'Instagram', aliases: ['instagram', 'ig', 'insta'] },
  { key: 'facebook', label: 'Facebook', aliases: ['facebook', 'fb'] },
  { key: 'x_handle', label: 'X (Twitter)', aliases: ['x', 'twitter', 'xhandle', 'twitterhandle'] },
  { key: 'research_source', label: 'Research Source', aliases: ['researchsource', 'source', 'leadsource'] },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Best-guess mapping of a CSV header to a lead field key, or null. */
export function autoMapHeader(header: string): string | null {
  const n = norm(header);
  if (!n) return null;
  for (const f of CSV_FIELDS) {
    if (norm(f.key) === n || norm(f.label) === n) return f.key;
    if (f.aliases.some((a) => norm(a) === n)) return f.key;
  }
  return null;
}
