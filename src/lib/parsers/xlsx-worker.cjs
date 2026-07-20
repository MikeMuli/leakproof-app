// Runs in an isolated worker thread. xlsx has an unpatched ReDoS/prototype-pollution
// advisory (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9) — never call it on the main thread
// against untrusted seller-uploaded files. This worker is killed on timeout by the parent.
const { parentPort, workerData } = require("worker_threads");
const XLSX = require("xlsx");

try {
  const buf = Buffer.from(workerData.bufferBase64, "base64");
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
  // Plain arrays of strings only — never forward the workbook object itself, so any
  // polluted prototype on XLSX's internal objects can't leak past this boundary.
  const clean = rows.map((row) => row.map((cell) => (cell === null || cell === undefined ? "" : String(cell))));
  parentPort.postMessage({ ok: true, rows: clean });
} catch (err) {
  parentPort.postMessage({ ok: false, error: String(err && err.message ? err.message : err) });
}
