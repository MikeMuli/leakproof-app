"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export type DiscrepancyState = "detected" | "auto_resolved" | "seller_dismissed" | "claim_generated" | "claim_filed" | "recovered" | "rejected";
const OPEN_DISPUTE_STATES: DiscrepancyState[] = ["detected", "claim_generated", "claim_filed"];

export interface OrderRow {
  id: string;
  platformOrderId: string;
  date: string;
  status: string;
  priceCents: number;
  commissionCents: number;
  transactionFeeCents: number;
  shippingCents: number;
  voucherCents: number;
  netCents: number;
  feeTableVersion: string;
  bucket: "TIMING" | "EXPECTED_FEE" | "DISPUTABLE" | "UNKNOWN";
  detectorType: string | null;
  gapCents: number;
  discrepancyId: string | null;
  state: DiscrepancyState;
  lines: { type: string; amountCents: number; rawDescription: string }[];
}

const rm = (c: number) =>
  (c < 0 ? "−" : "") + "RM" + (Math.abs(c) / 100).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DETECTOR_COPY: Record<string, [string, string]> = {
  commission_on_cancelled: ["Commission charged on a cancelled order", "The order was cancelled, but the settlement still carries commission and transaction fees with no matching reversal line."],
  shipping_overcharge: ["Shipping charged above the quoted rate", "The shipping deducted exceeds the expected rate for this order."],
  double_refund: ["The same refund was deducted twice", "Two refund lines reference the same order."],
  missing_settlement: ["No settlement line for a delivered order", "The order is past its settlement window with no settlement line recorded."],
};

const STATE_LABEL: Partial<Record<DiscrepancyState, string>> = {
  claim_generated: "Claim pack generated",
  claim_filed: "Filed with platform",
  recovered: "Recovered",
  rejected: "Rejected",
  seller_dismissed: "Dismissed",
};

export default function DashboardView({ rows, shopName, quarantineCount = 0, isAdmin = false }: { rows: OrderRow[]; shopName: string; quarantineCount?: number; isAdmin?: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<"DISPUTABLE" | "EVERYTHING">("DISPUTABLE");
  const [openId, setOpenId] = useState<string | null>(null);
  const [digestStatus, setDigestStatus] = useState<string | null>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current?.open && !menuRef.current.contains(e.target as Node)) menuRef.current.open = false;
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  async function sendDigestNow() {
    setDigestStatus("Sending…");
    const res = await fetch("/api/notifications/digest", { method: "POST" });
    const json = await res.json();
    setDigestStatus(json.ok ? "Sent — check your email." : `Failed: ${json.errors?.join("; ") ?? json.error}`);
  }

  const isOpenDispute = (r: OrderRow) => r.bucket === "DISPUTABLE" && OPEN_DISPUTE_STATES.includes(r.state);

  const agg = useMemo(() => {
    const settled = rows.filter((r) => r.bucket !== "TIMING");
    const timing = rows.filter((r) => r.bucket === "TIMING");
    const settledGmv = settled.reduce((s, r) => s + r.priceCents, 0);
    const fees = settled.reduce((s, r) => s + r.commissionCents + r.transactionFeeCents + r.shippingCents + r.voucherCents, 0);
    const disp = settled.filter(isOpenDispute).reduce((s, r) => s + r.gapCents, 0);
    const unk = settled.filter((r) => r.bucket === "UNKNOWN").reduce((s, r) => s + r.gapCents, 0);
    const recovered = settled.filter((r) => r.state === "recovered").reduce((s, r) => s + r.gapCents, 0);
    const kept = settledGmv - fees - disp - unk;
    const transitNet = timing.reduce((s, r) => s + r.netCents, 0);
    return { settledGmv, fees, disp, unk, kept, recovered, transitNet, tot: kept + (fees + unk) + disp };
  }, [rows]);

  const list = rows
    .filter((r) => (tab === "DISPUTABLE" ? isOpenDispute(r) : !isOpenDispute(r)))
    .sort((a, b) => b.gapCents - a.gapCents);

  const seg = [
    { l: "Settled to you", v: agg.kept, c: "var(--settled)" },
    { l: "Platform fees", v: agg.fees + agg.unk, c: "var(--fees)" },
    { l: "Worth disputing", v: agg.disp, c: "var(--disputed)" },
  ];

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 90px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, gap: 10 }}>
        <span className="lp-mark" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <i /> LeakProof — {shopName}
        </span>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          <a href="/upload" className="lp-btn lp-btn-primary">Upload</a>
          <details className="lp-menu" ref={menuRef}>
            <summary className="lp-btn lp-btn-ghost lp-menu-trigger" aria-label="More actions">⋯</summary>
            <div className="lp-menu-panel">
              <a href="/shops" className="lp-menu-item">Manage shops</a>
              <a href="/reports" className="lp-menu-item">Reports</a>
              {isAdmin && <a href="/admin/invites" className="lp-menu-item">Invites <span className="lp-badge" style={{ background: "var(--transit-bg)", color: "var(--transit)", marginLeft: 6 }}>admin</span></a>}
              {isAdmin && <a href="/admin/quarantine" className="lp-menu-item">Quarantine queue <span className="lp-badge" style={{ background: "var(--transit-bg)", color: "var(--transit)", marginLeft: 6 }}>admin</span></a>}
              <button onClick={sendDigestNow} className="lp-menu-item">{digestStatus ?? "Send weekly digest now"}</button>
              <div style={{ borderTop: "1px solid var(--line)", margin: "4px 0" }} />
              <button onClick={signOut} className="lp-menu-item" style={{ color: "var(--disputed)" }}>Sign out</button>
            </div>
          </details>
        </div>
      </div>

      {quarantineCount > 0 && (
        <a href="/admin/quarantine" className="lp-card" style={{
          display: "block", background: "var(--fees-bg)", borderColor: "var(--fees)", color: "var(--fees)",
          padding: "11px 15px", marginBottom: 20, fontSize: 13.5, fontWeight: 540,
        }}>
          {quarantineCount} upload{quarantineCount > 1 ? "s" : ""} couldn&apos;t be read — needs a parser fix →
        </a>
      )}

      <h1 style={{ fontSize: 27, marginBottom: 5 }}>
        Where your <span className="lp-money">{rm(agg.settledGmv)}</span> in settled orders went
      </h1>
      {agg.transitNet !== 0 && (
        <p style={{ color: "var(--ink-2)", marginBottom: 16, fontSize: 14 }}>
          Another <b className="lp-money">{rm(agg.transitNet)}</b> is still in transit.
        </p>
      )}

      <div style={{ display: "flex", height: 46, borderRadius: 12, overflow: "hidden", background: "var(--surface-sunk)", marginTop: 14 }}>
        {seg.map((s) => (
          <div key={s.l} style={{ flex: `0 0 ${agg.tot ? (s.v / agg.tot) * 100 : 0}%`, background: s.c, transition: "flex-basis .5s var(--ease-out)" }} title={s.l} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 11, fontSize: 13, color: "var(--ink-2)" }}>
        {seg.map((s) => (
          <span key={s.l}><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: s.c, marginRight: 6 }} />{s.l} <b className="lp-money">{rm(s.v)}</b></span>
        ))}
        {agg.recovered > 0 && (
          <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: "var(--transit)", marginRight: 6 }} />
            Recovered so far <b className="lp-money">{rm(agg.recovered)}</b></span>
        )}
      </div>

      <div style={{ display: "flex", gap: 4, marginTop: 30, borderBottom: "1px solid var(--line)" }}>
        <button onClick={() => setTab("DISPUTABLE")} className={`lp-tab ${tab === "DISPUTABLE" ? "active" : ""}`}
          style={{ borderBottomColor: tab === "DISPUTABLE" ? "var(--disputed)" : "transparent" }}>
          Disputable {rows.filter(isOpenDispute).length}
        </button>
        <button onClick={() => setTab("EVERYTHING")} className={`lp-tab ${tab === "EVERYTHING" ? "active" : ""}`}
          style={{ borderBottomColor: tab === "EVERYTHING" ? "var(--ink-3)" : "transparent" }}>
          Everything else {rows.filter((r) => !isOpenDispute(r)).length}
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        {list.map((r) => (
          <Row key={r.id} row={r} open={openId === r.id} onToggle={() => setOpenId(openId === r.id ? null : r.id)} />
        ))}
        {list.length === 0 && <p style={{ color: "var(--ink-3)", padding: "20px 0" }}>Nothing here.</p>}
      </div>
    </main>
  );
}

function Row({ row: r, open, onToggle }: { row: OrderRow; open: boolean; onToggle: () => void }) {
  const prevState = useRef(r.state);
  const [justChanged, setJustChanged] = useState(false);

  useEffect(() => {
    if (prevState.current !== r.state) {
      prevState.current = r.state;
      setJustChanged(true);
      const t = setTimeout(() => setJustChanged(false), 900);
      return () => clearTimeout(t);
    }
  }, [r.state]);

  return (
    <div className={`lp-row ${justChanged ? "lp-pulse" : ""}`}>
      <button onClick={onToggle} className="lp-row-head" aria-expanded={open}>
        <span>
          <span className="lp-money" style={{ fontSize: 13 }}>{r.platformOrderId}</span>
          <span style={{ color: "var(--ink-3)", fontSize: 12, marginLeft: 10 }}>{r.date}</span>
          {r.detectorType && <span style={{ marginLeft: 10, fontSize: 11, color: "var(--disputed)" }}>{r.detectorType.replace(/_/g, " ")}</span>}
          {STATE_LABEL[r.state] && <span style={{ marginLeft: 10, fontSize: 11, color: "var(--transit)" }}>{STATE_LABEL[r.state]}</span>}
        </span>
        <span className="lp-money" style={{ color: r.bucket === "DISPUTABLE" ? "var(--disputed)" : "var(--ink)", fontWeight: 560 }}>
          {rm(r.bucket === "DISPUTABLE" ? r.gapCents : r.netCents)}
        </span>
      </button>
      <div className={`lp-row-detail-wrap ${open ? "open" : ""}`} aria-hidden={!open} inert={!open ? true : undefined}>
        <div className="lp-row-detail-inner">
          <RowDetail row={r} />
        </div>
      </div>
    </div>
  );
}

async function transition(discrepancyId: string, toState: DiscrepancyState): Promise<string | null> {
  const res = await fetch("/api/discrepancies/transition", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ discrepancyId, toState }),
  });
  const json = await res.json();
  return json.error ?? null;
}

function RowDetail({ row }: { row: OrderRow }) {
  const router = useRouter();
  const [showPack, setShowPack] = useState(row.state !== "detected");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const copy = DETECTOR_COPY[row.detectorType ?? ""];

  const chain = [
    `${rm(row.priceCents)}   item price`,
    `− ${rm(row.commissionCents)}   commission (table ${row.feeTableVersion})`,
    `− ${rm(row.transactionFeeCents)}   transaction fee`,
    `− ${rm(row.shippingCents)}   shipping`,
    row.voucherCents ? `− ${rm(row.voucherCents)}   voucher` : "",
    `= ${rm(row.netCents)}   expected net`,
    "",
    `${rm(row.netCents - row.gapCents)}   actually settled`,
    `${rm(row.gapCents)}   ${row.bucket.toLowerCase()}`,
  ].filter(Boolean).join("\n");

  const packText = copy && `Subject: Incorrect deduction on order ${row.platformOrderId} — request for review

Issue: ${copy[0]}.
${copy[1]}

Order value        ${rm(row.priceCents)}
Expected net        ${rm(row.netCents)}
Shortfall claimed  ${rm(row.gapCents)}

Please review and credit the shortfall of ${rm(row.gapCents)}.`;

  async function generatePack() {
    setShowPack(true);
    if (row.state === "detected" && row.discrepancyId) {
      setBusy(true);
      const error = await transition(row.discrepancyId, "claim_generated");
      setBusy(false);
      if (error) { setErr(error); return; }
      router.refresh();
    }
  }

  async function mark(toState: DiscrepancyState) {
    if (!row.discrepancyId) return;
    setBusy(true);
    setErr(null);
    const error = await transition(row.discrepancyId, toState);
    setBusy(false);
    if (error) { setErr(error); return; }
    router.refresh();
  }

  return (
    <div style={{ padding: 15, borderTop: "1px solid var(--line)", background: "var(--surface-sunk)" }}>
      <pre style={{ fontSize: 12.5, whiteSpace: "pre-wrap", background: "var(--ink)", color: "var(--bg)", padding: 13, borderRadius: "var(--radius-sm)", fontFamily: "var(--font-mono)" }}>{chain}</pre>

      {copy && (
        <div style={{ marginTop: 12 }}>
          <b style={{ fontSize: 14.5 }}>{copy[0]}</b>
          <p style={{ color: "var(--ink-2)", fontSize: 13, marginTop: 3, marginBottom: 10 }}>{copy[1]}</p>

          {row.state === "detected" && (
            <div style={{ display: "flex", gap: 8 }}>
              <button disabled={busy} onClick={generatePack} className="lp-btn lp-btn-primary">Generate claim pack</button>
              <button disabled={busy} onClick={() => mark("seller_dismissed")} className="lp-btn">Not disputing this</button>
            </div>
          )}

          {showPack && (
            <div style={{ marginTop: 10 }}>
              <textarea readOnly value={packText ?? ""} className="lp-input" style={{ width: "100%", height: 210, fontFamily: "var(--font-mono)", fontSize: 12 }} />
              <button onClick={() => navigator.clipboard.writeText(packText ?? "")} className="lp-btn" style={{ marginTop: 8 }}>Copy</button>
            </div>
          )}

          {row.state === "claim_generated" && (
            <div style={{ marginTop: 10 }}>
              <button disabled={busy} onClick={() => mark("claim_filed")} className="lp-btn" style={{ background: "var(--transit)", borderColor: "var(--transit)", color: "#fff" }}>
                I&apos;ve filed this with {row.platformOrderId.slice(0, 2) === "TT" ? "TikTok" : "the platform"}
              </button>
            </div>
          )}

          {row.state === "claim_filed" && (
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button disabled={busy} onClick={() => mark("recovered")} className="lp-btn lp-btn-primary">Mark recovered</button>
              <button disabled={busy} onClick={() => mark("rejected")} className="lp-btn lp-btn-danger-outline">Platform rejected it</button>
            </div>
          )}

          {(row.state === "recovered" || row.state === "rejected" || row.state === "seller_dismissed") && (
            <p style={{ marginTop: 10, fontSize: 13.5, color: row.state === "recovered" ? "var(--settled)" : "var(--ink-3)", fontWeight: 540 }}>
              {row.state === "recovered" && `✓ Recovered ${rm(row.gapCents)}`}
              {row.state === "rejected" && "✕ Platform rejected this claim"}
              {row.state === "seller_dismissed" && "Marked as not worth disputing"}
            </p>
          )}

          {err && <p style={{ color: "var(--disputed)", fontSize: 12, marginTop: 6 }}>{err}</p>}
        </div>
      )}
    </div>
  );
}
