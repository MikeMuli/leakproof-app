import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const { data, error } = await supabase.auth.signInWithPassword({
  email: "mei-demo3@example.com", password: "Test-password-123",
});
if (error) throw error;
const token = data.session.access_token;

const bootstrap = await fetch("http://localhost:3000/api/bootstrap", {
  method: "POST", headers: { Authorization: `Bearer ${token}` },
});
const bootstrapJson = await bootstrap.json();
console.log("bootstrap:", bootstrapJson);

const fileName = process.argv[2] ?? "demo-shopee-income.xlsx";
const shopIdOverride = process.argv[3]; // optional: target a specific shop instead of the first one
const fileBuf = readFileSync(path.join(dir, fileName));
const form = new FormData();
form.append("file", new Blob([fileBuf]), fileName);
form.append("shopId", shopIdOverride ?? bootstrapJson.shopId ?? "");

const upload = await fetch("http://localhost:3000/api/upload", {
  method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form,
});
console.log("upload:", await upload.json());
