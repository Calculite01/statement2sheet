import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { ExtractionResult } from "@/lib/types";

// Column order comes from the statement itself (result.columns), not a fixed
// schema. Fall back to whatever keys show up in the rows if the model didn't
// return a columns list for some reason.
function resolveColumns(result: ExtractionResult): string[] {
  if (result.columns.length > 0) return result.columns;
  const seen = new Set<string>();
  for (const row of result.transactions) {
    for (const key of Object.keys(row)) seen.add(key);
  }
  return Array.from(seen);
}

function toRows(result: ExtractionResult, columns: string[]) {
  return result.transactions.map((row) => {
    const ordered: Record<string, string> = {};
    for (const col of columns) {
      ordered[col] = row[col] ?? "";
    }
    return ordered;
  });
}

function baseFilename(sourceName: string) {
  return sourceName.replace(/\.pdf$/i, "").replace(/[^a-z0-9-_]+/gi, "_");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadAsXlsx(result: ExtractionResult, sourceName: string) {
  const columns = resolveColumns(result);
  const rows = toRows(result, columns);
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: columns });
  worksheet["!cols"] = columns.map((col) => ({
    wch: Math.min(Math.max(col.length + 4, 12), 42),
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, `${baseFilename(sourceName)}.xlsx`);
}

export function downloadAsCsv(result: ExtractionResult, sourceName: string) {
  const columns = resolveColumns(result);
  const rows = toRows(result, columns);
  const csv = Papa.unparse({ fields: columns, data: rows.map((r) => columns.map((c) => r[c])) });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, `${baseFilename(sourceName)}.csv`);
}
