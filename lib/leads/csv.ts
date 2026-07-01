// Minimal, dependency-free CSV parser. Handles quoted fields, escaped quotes
// (""), commas and newlines inside quotes, and CRLF. Good enough for the pasted
// exports our team collects from LinkedIn / Clutch / directories.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  // Strip a leading BOM.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
    } else if (c === '\r') {
      // handled by the \n branch; ignore lone CR
    } else {
      field += c;
    }
  }
  // flush last field/row
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  // drop fully empty trailing rows
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}
