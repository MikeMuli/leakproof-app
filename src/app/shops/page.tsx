"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import TopBar from "../components/TopBar";
import PlatformBadge from "../components/PlatformBadge";
import { PageSkeleton } from "../components/Skeletons";

interface Shop {
  id: string;
  platform: string;
  country_code: string;
  shop_name: string;
}

const PLATFORMS = ["shopee", "tiktok", "lazada"] as const;

export default function ShopsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>("shopee");
  const [country, setCountry] = useState("MY");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: seller } = await supabase.from("sellers").select("id").eq("auth_user_id", user.id).maybeSingle();
    if (!seller) { setLoading(false); return; } // /upload's bootstrap call creates it; nothing to list yet

    const { data } = await supabase.from("shops").select("id, platform, country_code, shop_name").eq("seller_id", seller.id).order("shop_name");
    setShops(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function addShop(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    const { data: seller } = await supabase.from("sellers").select("id").eq("auth_user_id", user!.id).maybeSingle();
    if (!seller) { setError("account not set up yet"); setBusy(false); return; }

    const { error } = await supabase.from("shops").insert({
      seller_id: seller.id, platform, country_code: country, shop_name: name || `${platform} ${country}`,
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setName("");
    load();
  }

  async function removeShop(id: string) {
    if (!confirm("Remove this shop? Its orders and history stay in the database but the shop itself is deleted.")) return;
    await supabase.from("shops").delete().eq("id", id);
    load();
  }

  if (loading) return (
    <>
      <TopBar current="shops" />
      <PageSkeleton />
    </>
  );

  return (
    <>
      <TopBar current="shops" title="Shops" />
      <main className="lp-page">
        <div className="lp-page-grid">
        <aside className="lp-page-aside">
          <h2>Your shops</h2>
          <p className="sub">Each upload belongs to one shop. Add every marketplace account you sell on — Shopee, TikTok Shop and Lazada.</p>
        </aside>
        <div className="lp-page-main">
          {shops.length === 0 && <p style={{ color: "var(--ink-3)" }}>No shops yet — add your first one below.</p>}

          {shops.map((s) => (
            <div key={s.id} className="lp-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 13 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <PlatformBadge platform={s.platform} size={30} />
                <div>
                  <b>{s.shop_name}</b>
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{s.platform} · {s.country_code}</div>
                </div>
              </div>
              <button onClick={() => removeShop(s.id)} className="lp-btn lp-btn-ghost" style={{ color: "var(--disputed)", fontSize: 13 }}>Remove</button>
            </div>
          ))}

          <form onSubmit={addShop} className="lp-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, margin: "0 0 12px" }}>Add a shop</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select value={platform} onChange={(e) => setPlatform(e.target.value as typeof platform)} className="lp-input">
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} placeholder="Country" maxLength={2}
                className="lp-input" style={{ width: 64 }} />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Shop name (optional)"
                className="lp-input" style={{ flex: 1, minWidth: 140 }} />
              <button type="submit" disabled={busy} className="lp-btn lp-btn-primary">{busy ? "…" : "Add"}</button>
            </div>
            {error && <p role="alert" style={{ color: "var(--disputed)", fontSize: 13, marginTop: 8 }}>{error}</p>}
          </form>

          {shops.length > 0 && (
            <a href="/upload" className="lp-btn lp-btn-ghost" style={{ display: "inline-flex", alignSelf: "start" }}>Upload a file for one of these shops →</a>
          )}
        </div>
        </div>
      </main>
    </>
  );
}
