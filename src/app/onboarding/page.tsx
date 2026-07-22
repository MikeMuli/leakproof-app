"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import TopBar from "../components/TopBar";
import PlatformBadge from "../components/PlatformBadge";
import LedgerMotif from "../components/LedgerMotif";
import UploadDrop from "../components/UploadDrop";
import { Skel } from "../components/Skeletons";
import { PLATFORMS, EXPORT_HELP, platformLabel } from "@/lib/exportHelp";

interface Shop { id: string; platform: string; country_code: string; shop_name: string }

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [loading, setLoading] = useState(true);

  const [shops, setShops] = useState<Shop[]>([]);
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>("shopee");
  const [country, setCountry] = useState("MY");
  const [shopName, setShopName] = useState("");
  const [shopBusy, setShopBusy] = useState(false);
  const [shopError, setShopError] = useState<string | null>(null);

  const [shopId, setShopId] = useState("");
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      await fetch("/api/bootstrap", { method: "POST" });
      const { data: seller } = await supabase.from("sellers").select("id").eq("auth_user_id", user.id).maybeSingle();
      if (!seller) { setLoading(false); return; }

      const { data: shopRows } = await supabase
        .from("shops").select("id, platform, country_code, shop_name").eq("seller_id", seller.id).order("shop_name");
      setShops(shopRows ?? []);
      if (shopRows && shopRows.length > 0) {
        setShopId(shopRows[0].id);
        setStep(1); // shop already exists — skip straight to upload
      }
      setLoading(false);
    })();
  }, [router, supabase]);

  async function addShop(e: React.FormEvent) {
    e.preventDefault();
    setShopBusy(true);
    setShopError(null);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: seller } = await supabase.from("sellers").select("id").eq("auth_user_id", user!.id).maybeSingle();
    if (!seller) { setShopError("Account not ready yet — refresh and try again."); setShopBusy(false); return; }

    const { data: newShop, error } = await supabase.from("shops")
      .insert({ seller_id: seller.id, platform, country_code: country, shop_name: shopName || `${platform} ${country}` })
      .select("id").single();
    setShopBusy(false);
    if (error) { setShopError(error.message); return; }
    setShopId(newShop.id);
    setStep(1);
  }

  async function onFile(file: File) {
    if (!file || !shopId) return;
    setUploadBusy(true);
    setUploadStatus("Uploading and reconciling…");
    const form = new FormData();
    form.append("file", file);
    form.append("shopId", shopId);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = await res.json();
    setUploadBusy(false);

    if (json.error) { setUploadStatus(`Error: ${json.error}`); return; }
    if (json.quarantined) { setUploadStatus(`Couldn't read this file yet: ${json.reason}. Try a different export, or skip for now.`); return; }

    setStep(2);
  }

  if (loading) return (
    <>
      <TopBar current="dashboard" variant="light" />
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "28px 20px 90px" }} aria-busy="true" aria-label="Loading">
        <Skel h={4} r={99} style={{ marginBottom: 26 }} />
        <Skel w={72} h={54} r={12} style={{ marginBottom: 12 }} />
        <Skel w="80%" h={24} r={7} style={{ marginBottom: 8 }} />
        <Skel w="95%" h={13} style={{ marginBottom: 6 }} />
        <Skel w="88%" h={13} style={{ marginBottom: 24 }} />
        <div className="lp-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <Skel w={140} h={16} />
          <Skel h={44} r={10} />
          <Skel h={44} r={10} />
          <Skel w={130} h={44} r={10} />
        </div>
      </main>
    </>
  );

  return (
    <>
      <TopBar current="dashboard" variant="light" title="Getting set up" />
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "28px 20px 90px" }}>

      <div style={{ display: "flex", gap: 6, margin: "0 0 26px" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ height: 4, flex: 1, borderRadius: 99, background: i <= step ? "var(--settled)" : "var(--surface-sunk)" }} />
        ))}
      </div>

      {step === 0 && (
        <>
          <LedgerMotif size={72} />
          <h1 style={{ fontSize: 24, marginTop: 10 }}>Welcome — let&apos;s find your leaks</h1>
          <p className="lede" style={{ fontSize: 15 }}>
            Three things happen here: you connect a shop, upload the settlement file that platform already gives you,
            and we show you exactly what you sold, what was taken in fees, and what&apos;s worth disputing.
            No passwords, no writing to your account — you download a file, we read it.
          </p>

          <div className="lp-card" style={{ padding: 18, marginBottom: 20 }}>
            <h2 style={{ margin: "0 0 10px" }}>First, which platform?</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {PLATFORMS.map((p) => (
                <button key={p} onClick={() => setPlatform(p)} className="lp-btn"
                  style={{ gap: 8, ...(p === platform ? { background: "var(--settled)", borderColor: "var(--settled)", color: "#fff" } : {}) }}>
                  <PlatformBadge platform={p} size={18} />
                  {platformLabel(p)}
                </button>
              ))}
            </div>

            <form onSubmit={addShop} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ fontSize: 13, color: "var(--ink-2)" }}>
                Shop name
                <input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. My Shopee Shop"
                  className="lp-input" style={{ width: "100%", marginTop: 4 }} />
              </label>
              <label style={{ fontSize: 13, color: "var(--ink-2)" }}>
                Country
                <input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={2}
                  className="lp-input" style={{ width: 70, marginTop: 4, display: "block" }} />
              </label>
              {shopError && <p role="alert" style={{ color: "var(--disputed)", fontSize: 13 }}>{shopError}</p>}
              <button type="submit" disabled={shopBusy} className="lp-btn lp-btn-primary">
                {shopBusy ? "…" : "Add this shop"}
              </button>
            </form>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <h1 style={{ fontSize: 24 }}>Upload your settlement file</h1>
          <p className="lede" style={{ fontSize: 15 }}>
            {`This is the file ${platformLabel(shopPlatform(shops, shopId, platform))} already gives you — we're not asking for anything new.`}
          </p>

          {shops.length > 1 && (
            <label style={{ fontSize: 13, color: "var(--ink-2)", display: "block", marginBottom: 12 }}>
              Which shop is this file for?
              <select value={shopId} onChange={(e) => setShopId(e.target.value)} className="lp-input" style={{ width: "100%", marginTop: 4 }}>
                {shops.map((s) => <option key={s.id} value={s.id}>{s.shop_name} ({s.platform})</option>)}
              </select>
            </label>
          )}

          <details className="lp-card" style={{ padding: 16, marginBottom: 16 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>
              Where do I find this file in {EXPORT_HELP[shopPlatform(shops, shopId, platform)].where}?
            </summary>
            <ol style={{ margin: "10px 0 0", paddingLeft: 18, color: "var(--ink-2)", fontSize: 14, lineHeight: 1.7 }}>
              {EXPORT_HELP[shopPlatform(shops, shopId, platform)].steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </details>

          <UploadDrop onFile={onFile} disabled={uploadBusy} />
          {uploadStatus && <p style={{ marginTop: 12, fontSize: 13.5, color: "var(--ink-2)" }}>{uploadStatus}</p>}

          <button onClick={() => router.push("/dashboard")} className="lp-btn lp-btn-ghost" style={{ marginTop: 16 }}>
            Skip for now
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h1 style={{ fontSize: 24 }}>You&apos;re set up</h1>
          <p className="lede" style={{ fontSize: 15 }}>
            We&apos;ve reconciled that file. Your dashboard shows what&apos;s settled, what was taken in fees, and
            what&apos;s worth disputing — with a ready-to-copy claim for every flagged order.
          </p>
          <button onClick={() => router.push("/dashboard")} className="lp-btn lp-btn-primary">See my dashboard</button>
        </>
      )}
      </main>
    </>
  );
}

function shopPlatform(shops: Shop[], shopId: string, fallback: string): (typeof PLATFORMS)[number] {
  const found = shops.find((s) => s.id === shopId)?.platform;
  return (found ?? fallback) as (typeof PLATFORMS)[number];
}
