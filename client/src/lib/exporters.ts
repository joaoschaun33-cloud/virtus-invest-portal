function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "";
  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const content = [
    columns,
    ...rows.map(row => columns.map(column => row[column] ?? "")),
  ]
    .map(row => row.map(escapeCsv).join(","))
    .join("\n");
  return `\ufeff${content}`;
}

export function downloadCsv(
  filename: string,
  rows: Array<Record<string, unknown>>
) {
  const content = buildCsv(rows);
  if (!content) return false;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function buildReportHtml(
  title: string,
  subtitle: string,
  sections: Array<{ heading: string; columns: string[]; rows: unknown[][] }>
) {
  const tables = sections
    .map(
      section =>
        `<section><h2>${escapeHtml(section.heading)}</h2><table><thead><tr>${section.columns.map(column => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${section.rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></section>`
    )
    .join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Inter,Arial,sans-serif;color:#171717;padding:36px;line-height:1.4}h1{font-size:24px;margin:0 0 4px}h2{font-size:15px;margin:28px 0 8px}p{color:#666;font-size:12px;margin:0 0 20px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{text-align:left;padding:8px;border-bottom:1px solid #e5e5e5}th{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#666}footer{margin-top:32px;color:#777;font-size:10px}@media print{body{padding:0}}</style></head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p>${tables}<footer>Relatório informativo gerado pelo Virtus. Não constitui recomendação de investimento. Os valores refletem os dados disponíveis no momento da exportação.</footer><script>window.onload=()=>window.print();</script></body></html>`;
}

export function printReport(
  title: string,
  subtitle: string,
  sections: Array<{ heading: string; columns: string[]; rows: unknown[][] }>
) {
  // A report is generated locally. `noopener` makes some browsers return null,
  // preventing us from writing the document before printing it.
  const popup = window.open("", "_blank", "width=1100,height=800");
  if (!popup) return false;
  popup.opener = null;
  popup.document.write(buildReportHtml(title, subtitle, sections));
  popup.document.close();
  return true;
}
