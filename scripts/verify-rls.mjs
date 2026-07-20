// Verifies RLS actually isolates two sellers from each other — not just that policies
// exist, but that seller A's query genuinely cannot see seller B's row. Creates two
// throwaway auth users + shops, checks isolation both ways, then cleans up.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnv(path) {
  const text = readFileSync(path, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv(new URL("../.env.local", import.meta.url));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(URL_, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

function randEmail(tag) {
  return `leakproof-test-${tag}-${Date.now()}@example.invalid`;
}

async function createSeller(tag) {
  const email = randEmail(tag);
  const password = "Test-password-" + Math.random().toString(36).slice(2);
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (authErr) throw authErr;

  const { data: sellerRow, error: sellerErr } = await admin
    .from("sellers")
    .insert({ auth_user_id: authData.user.id, email })
    .select()
    .single();
  if (sellerErr) throw sellerErr;

  const { data: shopRow, error: shopErr } = await admin
    .from("shops")
    .insert({ seller_id: sellerRow.id, platform: "shopee", country_code: "MY", shop_name: `${tag}'s shop` })
    .select()
    .single();
  if (shopErr) throw shopErr;

  const client = createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;

  return { authUserId: authData.user.id, sellerId: sellerRow.id, shopId: shopRow.id, client };
}

async function cleanup(ids) {
  for (const id of ids) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
}

async function main() {
  console.log("creating seller A and seller B...");
  const a = await createSeller("A");
  const b = await createSeller("B");

  try {
    // A queries shops as themselves — should see only their own shop.
    const { data: aShops, error: aErr } = await a.client.from("shops").select("id, shop_name");
    if (aErr) throw aErr;
    const aSeesOwn = aShops.some((s) => s.id === a.shopId);
    const aSeesB = aShops.some((s) => s.id === b.shopId);

    const { data: bShops, error: bErr } = await b.client.from("shops").select("id, shop_name");
    if (bErr) throw bErr;
    const bSeesOwn = bShops.some((s) => s.id === b.shopId);
    const bSeesA = bShops.some((s) => s.id === a.shopId);

    console.log({ aSeesOwn, aSeesB, bSeesOwn, bSeesA });

    if (aSeesOwn && !aSeesB && bSeesOwn && !bSeesA) {
      console.log("PASS: RLS isolates sellers — each sees only their own shop, never the other's.");
    } else {
      console.error("FAIL: cross-tenant isolation broken.");
      process.exitCode = 1;
    }
  } finally {
    await cleanup([a.authUserId, b.authUserId]);
    console.log("cleaned up test users.");
  }
}

main().catch((err) => {
  console.error("verify-rls errored:", err);
  process.exitCode = 1;
});
