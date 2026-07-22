"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import TopBar from "../components/TopBar";
import PlatformBadge from "../components/PlatformBadge";
import UploadDrop from "../components/UploadDrop";
import { PageSkeleton } from "../components/Skeletons";
import { EXPORT_HELP, platformLabel, type PlatformKey } from "@/lib/exportHelp";

interface Shop { id: string; platform: string; country_code: string; shop_name: string }

type Phase = "idle" | "working" | "done" | "error" | "quarantined";

export default function UploadPage() {
  const router = useRouter();
  const supabase = createClient();
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState<string>("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [loadingShops, setLoadingShops] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const boot = await fetch("/api/bootstrap", { method: "POST" });
      const bootJson = await boot.json();
      if (bootJson.error) { setMessage(`Setup failed: ${bootJson.error}`); setLoadingShops(false); return; }

      const { data: seller } = await supabase.from("sellers").select("id").eq("auth_user_id", user.id).maybeSingle();
      const { data: shopRows } = await supabase
        .from("shops").select("id, platform, country_code, shop_name").eq("seller_id", seller!.id).order("shop_name");

      setShops(shopRows ?? []);
      if (shopRows && shopRows.length > 0) setShopId(shopRows[0].id);
      setLoadingShops(false);
    })();
  }, [router, supabase]);

  const selectedShop = shops.find((s) => s.id === shopId);
  const help = selectedShop ? EXPORT_HELP[selectedShop.platform as PlatformKey] : undefined;

  async function onFile(file: File) {
    if (!shopId) return;
    setPhase("working");
    setMessage(null);

    const form = new FormData();
    form.append("file", file);
    form.append("shopId", shopId);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = await res.json();

    if (json.error) { setPhase("error"); setMessage(json.error); return; }
    if (json.quarantined) { setPhase("quarantined"); setMessage(json.reason); return; }

    setPhase("done");
    setMessage(`Reconciled ${json.ordersProcessed} order${json.ordersProcessed === 1 ? "" : "s"}.`);
    setTimeout(() => { router.push("/dashboard"); router.refresh(); }, 900);
  }

  if (loadingShops) return (
    <>
      <TopBar current="upload" />
      <PageSkeleton />
    </>
  );

  return (
    <>
      <TopBar current="upload" title="Upload" />
      <main className="lp-page">
        <div className="lp-page-grid">
        <aside className="lp-page-aside">
          <h2>Upload a settlement file</h2>
          <p className="sub">The same file you&apos;d download from Seller Center — nothing new to prepare. We read it, never write to your shop.</p>
          {help && (
            <div style={{ marginTop: 18, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)", marginBottom: 8 }}>
                Where to find it in {help.where}
              </div>
              <ol style={{ margin: 0, paddingLeft: 18, color: "var(--ink-3)", fontSize: 13, lineHeight: 1.7 }}>
                {help.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          )}
        </aside>
        <div className="lp-page-main">
        {shops.length === 0 ? (
          <div className="lp-card" style={{ padding: 24, textAlign: "center" }}>
            <p style={{ marginBottom: 14 }}>You&apos;ll need a shop before uploading a file.</p>
            <a href="/onboarding" className="lp-btn lp-btn-primary">Get set up →</a>
          </div>
        ) : (
          <>
            <label style={{ fontSize: 13, color: "var(--ink-2)", display: "block" }}>
              Which shop is this file for?
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                {selectedShop && <PlatformBadge platform={selectedShop.platform} size={30} />}
                <select value={shopId} onChange={(e) => setShopId(e.target.value)} disabled={phase === "working"}
                  className="lp-input" style={{ flex: 1 }}>
                  {shops.map((s) => <option key={s.id} value={s.id}>{s.shop_name} ({platformLabel(s.platform)} {s.country_code})</option>)}
                </select>
              </div>
            </label>

            <UploadDrop onFile={onFile} disabled={phase === "working" || !shopId} />

            {phase !== "idle" && (
              <div className="lp-steps">
                <div className={`lp-step ${phase === "working" ? "active" : "done"}`}>
                  <span className="dot" />
                  Uploading &amp; reconciling
                </div>
                {phase === "done" && (
                  <div className="lp-step done"><span className="dot" />{message}</div>
                )}
                {phase === "error" && (
                  <div className="lp-step" style={{ color: "var(--disputed)" }}>
                    <span className="dot" style={{ borderColor: "var(--disputed)" }} />
                    {message}
                  </div>
                )}
                {phase === "quarantined" && (
                  <div className="lp-step" style={{ color: "var(--fees)" }}>
                    <span className="dot" style={{ borderColor: "var(--fees)" }} />
                    Couldn&apos;t read this file: {message}
                  </div>
                )}
              </div>
            )}
          </>
        )}
        </div>
        </div>
      </main>
    </>
  );
}
