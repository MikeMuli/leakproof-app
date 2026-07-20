import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

function loadEnv(p) {
  const text = readFileSync(p, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}
const dir = path.dirname(fileURLToPath(import.meta.url));
const env = loadEnv(path.join(dir, "..", ".env.local"));

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data, error } = await supabase.auth.signInWithPassword({ email: "mei-demo3@example.com", password: "Test-password-123" });
if (error) throw error;
const token = data.session.access_token;

const month = process.argv[2] ?? "2026-06";

const xlsxRes = await fetch(`http://localhost:3000/api/reports?month=${month}&format=xlsx`, {
  headers: { Authorization: `Bearer ${token}` },
});
const xlsxBuf = Buffer.from(await xlsxRes.arrayBuffer());
writeFileSync(path.join(dir, "demo-report.xlsx"), xlsxBuf);
console.log("xlsx bytes:", xlsxBuf.length, "content-type:", xlsxRes.headers.get("content-type"));

const wb = XLSX.read(xlsxBuf, { type: "buffer" });
console.log("sheets:", wb.SheetNames);
const summary = XLSX.utils.sheet_to_json(wb.Sheets["Summary"], { header: 1 });
console.log("summary rows:", JSON.stringify(summary));

const pdfRes = await fetch(`http://localhost:3000/api/reports?month=${month}&format=pdf`, {
  headers: { Authorization: `Bearer ${token}` },
});
const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
writeFileSync(path.join(dir, "demo-report.pdf"), pdfBuf);
console.log("pdf bytes:", pdfBuf.length, "content-type:", pdfRes.headers.get("content-type"), "magic:", pdfBuf.subarray(0, 5).toString());
