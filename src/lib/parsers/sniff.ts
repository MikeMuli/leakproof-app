import { parseXlsxSafely } from "./safe-xlsx";

/**
 * Reads just the header row so the registry can resolve a parser before committing to a
 * full parse. XLSX goes through the sandboxed worker (safe-xlsx.ts — unpatched xlsx
 * advisory); CSV is read directly since it carries none of that risk.
 */
export async function sniffHeaderRow(buffer: Buffer, filename: string): Promise<string[]> {
  if (filename.toLowerCase().endsWith(".csv")) {
    let text: string;
    if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) text = buffer.toString("utf8", 3);
    else if (buffer[0] === 0xff && buffer[1] === 0xfe) text = buffer.toString("utf16le", 2);
    else text = buffer.toString("utf8");
    const firstLine = text.split(/\r\n|\n/)[0] ?? "";
    return firstLine.split(",").map((c) => c.replace(/^"|"$/g, ""));
  }
  const rows = await parseXlsxSafely(buffer, 8000);
  return rows[0] ?? [];
}
