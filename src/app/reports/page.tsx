"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import TopBar from "../components/TopBar";
import { PageSkeleton } from "../components/Skeletons";

interface Shop { id: string; shop_name: string }

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export default function ReportsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState<string>(""); // "" = all shops, consolidated
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: seller } = await supabase.from("sellers").select("id").eq("auth_user_id", user.id).maybeSingle();
      if (!seller) { setLoading(false); return; }
      const { data } = await supabase.from("shops").select("id, shop_name").eq("seller_id", seller.id).order("shop_name");
      setShops(data ?? []);
      setLoading(false);
    })();
  }, [router, supabase]);

  if (loading) return (
    <>
      <TopBar current="reports" />
      <PageSkeleton />
    </>
  );

  const query = new URLSearchParams({ month, ...(shopId ? { shopId } : {}) });

  return (
    <>
      <TopBar current="reports" title="Reports" />
      <main className="lp-page">
        <div className="lp-page-grid">
        <aside className="lp-page-aside">
          <h2>Monthly statement</h2>
          <p className="sub">
            A settled / fees / flagged / recovered breakdown for one month, as XLSX or PDF.
            Recovered reflects the discrepancies you&apos;ve marked recovered on the dashboard.
          </p>
        </aside>
        <div className="lp-page-main">
          <div className="lp-card" style={{ padding: 24 }}>
            <label style={{ display: "block", fontSize: 13, color: "var(--ink-2)", marginBottom: 4 }}>Shop</label>
            <select value={shopId} onChange={(e) => setShopId(e.target.value)} className="lp-input" style={{ width: "100%", marginBottom: 16 }}>
              <option value="">All shops (consolidated)</option>
              {shops.map((s) => <option key={s.id} value={s.id}>{s.shop_name}</option>)}
            </select>

            <label style={{ display: "block", fontSize: 13, color: "var(--ink-2)", marginBottom: 4 }}>Month</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="lp-input" style={{ width: "100%", marginBottom: 20 }} />

            <div style={{ display: "flex", gap: 10 }}>
              <a href={`/api/reports?${query.toString()}&format=xlsx`} className="lp-btn lp-btn-primary" style={{ flex: 1 }}>
                Download XLSX
              </a>
              <a href={`/api/reports?${query.toString()}&format=pdf`} className="lp-btn" style={{ flex: 1, borderColor: "var(--settled)", color: "var(--settled)" }}>
                Download PDF
              </a>
            </div>
          </div>
        </div>
        </div>
      </main>
    </>
  );
}
