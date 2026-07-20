"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Shop { id: string; platform: string; country_code: string; shop_name: string }

export default function UploadPage() {
  const router = useRouter();
  const supabase = createClient();
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState<string>("");
  const [status, setStatus] = useState("Loading your shops…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const boot = await fetch("/api/bootstrap", { method: "POST" });
      const bootJson = await boot.json();
      if (bootJson.error) { setStatus(`Setup failed: ${bootJson.error}`); return; }

      const { data: seller } = await supabase.from("sellers").select("id").eq("auth_user_id", user.id).maybeSingle();
      const { data: shopRows } = await supabase
        .from("shops").select("id, platform, country_code, shop_name").eq("seller_id", seller!.id).order("shop_name");

      setShops(shopRows ?? []);
      if (shopRows && shopRows.length > 0) {
        setShopId(shopRows[0].id);
        setStatus("Choose a shop, then upload its file.");
      } else {
        setStatus("You need a shop before uploading.");
      }
    })();
  }, [router, supabase]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !shopId) return;
    setBusy(true);
    setStatus("Uploading and reconciling…");

    const form = new FormData();
    form.append("file", file);
    form.append("shopId", shopId);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = await res.json();
    setBusy(false);

    if (json.error) { setStatus(`Error: ${json.error}`); return; }
    if (json.quarantined) { setStatus(`Couldn't read this file yet: ${json.reason}`); return; }

    setStatus(`Processed ${json.ordersProcessed} orders. Redirecting…`);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 480, margin: "90px auto", padding: "0 20px", textAlign: "center" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Upload a file</h1>
      <p style={{ color: "var(--ink-2)", marginBottom: 22, fontSize: 14 }}>{status}</p>

      {shops.length === 0 ? (
        <a href="/shops" className="lp-btn lp-btn-primary">Add a shop →</a>
      ) : (
        <>
          <select value={shopId} onChange={(e) => setShopId(e.target.value)} disabled={busy}
            className="lp-input" style={{ marginBottom: 18, minWidth: 240 }}>
            {shops.map((s) => <option key={s.id} value={s.id}>{s.shop_name} ({s.platform} {s.country_code})</option>)}
          </select>
          <br />
          <input type="file" accept=".xlsx,.csv" disabled={!shopId || busy} onChange={onFile} />
          <p style={{ marginTop: 22 }}><a href="/shops" className="lp-btn lp-btn-ghost" style={{ fontSize: 13 }}>Manage shops</a></p>
        </>
      )}
    </main>
  );
}
