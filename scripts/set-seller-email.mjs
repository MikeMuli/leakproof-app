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

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const newEmail = process.argv[2];
const { data, error } = await admin
  .from("sellers").update({ email: newEmail }).eq("email", "mei-demo3@example.com").select();
if (error) throw error;
console.log("updated:", data);
