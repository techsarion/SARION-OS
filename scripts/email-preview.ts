/**
 * Email preview generator — renders every template with sample data to static
 * HTML files in .email-previews/ plus an index.html gallery. Open them in a
 * browser (and your phone / dark mode) for visual QA without sending anything.
 *
 * Run:  npx tsx scripts/email-preview.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { renderEmail } from "../lib/email";
import { fromFor } from "../lib/email/senders";
import { SAMPLE_PAYLOADS, ALL_EMAIL_KINDS } from "../lib/email/samples";

const OUT = join(process.cwd(), ".email-previews");
mkdirSync(OUT, { recursive: true });

const rows: string[] = [];
for (const kind of ALL_EMAIL_KINDS) {
  const content = renderEmail(kind, SAMPLE_PAYLOADS[kind]);
  const file = `${kind}.html`;
  writeFileSync(join(OUT, file), content.html, "utf8");
  rows.push(
    `<tr><td><a href="${file}">${kind}</a></td><td>${fromFor(kind)}</td><td>${content.subject}</td></tr>`,
  );
  console.log(`✓ ${kind.padEnd(26)} from ${fromFor(kind)}`);
}

const index = `<!doctype html><meta charset="utf-8"><title>Sarion email previews</title>
<style>body{font-family:system-ui;margin:40px;max-width:900px}h1{font-size:20px}
table{border-collapse:collapse;width:100%}td{padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:14px}
a{color:#2563eb;text-decoration:none;font-weight:600}</style>
<h1>Sarion email previews (${ALL_EMAIL_KINDS.length})</h1>
<table><tr><th align=left>Template</th><th align=left>From</th><th align=left>Subject</th></tr>${rows.join("")}</table>`;
writeFileSync(join(OUT, "index.html"), index, "utf8");

console.log(`\nGenerated ${ALL_EMAIL_KINDS.length} previews → ${OUT}\nOpen .email-previews/index.html`);
