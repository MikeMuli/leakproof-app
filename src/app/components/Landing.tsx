import PlatformBadge from "./PlatformBadge";
import { Search, FileCheck2, ShieldCheck, ArrowRight, AlertTriangle, Clock, TrendingUp } from "lucide-react";

const INVITE_MAILTO =
  "mailto:michaelmulimutua@gmail.com?subject=PayoutCheck%20invite%20request&body=Hi%2C%20I%27d%20like%20an%20invite%20to%20PayoutCheck.%20My%20shops%3A%20";

function RibbonPreview() {
  const seg = [
    { l: "Settled", w: 68, c: "var(--settled)" },
    { l: "Fees", w: 22, c: "var(--fees)" },
    { l: "Disputable", w: 10, c: "var(--disputed)" },
  ];
  return (
    <div className="lp-card lp-land-preview">
      <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 560, marginBottom: 10 }}>Where your RM24,180 went</div>
      <div style={{ display: "flex", height: 42, borderRadius: 10, overflow: "hidden", background: "var(--surface-sunk)" }}>
        {seg.map((s) => <div key={s.l} style={{ flexBasis: `${s.w}%`, background: s.c }} />)}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 12, color: "var(--ink-2)", flexWrap: "wrap" }}>
        {seg.map((s) => (
          <span key={s.l} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.c }} /> {s.l}
          </span>
        ))}
      </div>
      <div className="lp-card lp-land-preview-float">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
            <PlatformBadge platform="shopee" size={26} />
            <span>
              <span className="lp-money" style={{ fontSize: 13, display: "block" }}>SH26100003</span>
              <span style={{ fontSize: 11.5, color: "var(--disputed)" }}>commission on cancelled</span>
            </span>
          </span>
          <span className="lp-money" style={{ color: "var(--disputed)", fontWeight: 600 }}>RM12.60</span>
        </div>
      </div>
      <div className="lp-land-chip">
        <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--settled)", display: "inline-block" }} />
        RM840.20 recovered this quarter
      </div>
    </div>
  );
}

/* ---- product mockups used as the "imagery" for each how-it-works step ---- */

function UploadMock() {
  return (
    <div className="lp-land-mock">
      <div className="lp-land-mock-drop">Drag your settlement file here</div>
      <div className="lp-land-filechip">
        <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--settled)" }} />
        <b style={{ fontSize: 12.5 }}>Income_Released_2026-06.xlsx</b>
        <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>84 KB</span>
      </div>
    </div>
  );
}

function ReconMock() {
  return (
    <div className="lp-land-mock">
      <pre className="lp-land-chain">{`RM89.00   item price
− RM7.57   commission 8.5%
− RM1.78   transaction fee
= RM74.75   expected net
  RM0.00   actually settled
  RM74.75   missing settlement`}</pre>
    </div>
  );
}

function ClaimMock() {
  return (
    <div className="lp-land-mock">
      <div className="lp-land-ticket">
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Incorrect deduction on order SH26100003</div>
        <div style={{ color: "var(--ink-2)" }}>Order value RM120.00 · Expected net RM102.50</div>
        <div style={{ color: "var(--disputed)", fontWeight: 600, marginTop: 2 }}>Shortfall claimed RM12.60</div>
      </div>
      <div className="lp-btn" style={{ marginTop: 10, fontSize: 12.5, pointerEvents: "none", alignSelf: "start" }}>Copy ticket</div>
    </div>
  );
}

const STEPS = [
  { icon: Search, mock: <UploadMock />, t: "Upload your settlement file", d: "The same export Shopee, TikTok Shop and Lazada already give you. Read-only — we never touch your account." },
  { icon: FileCheck2, mock: <ReconMock />, t: "We reconcile every order", d: "Order-by-order, against every fee and deduction. Each discrepancy is classified and explained down to the source line." },
  { icon: ShieldCheck, mock: <ClaimMock />, t: "You get dispute-ready claims", d: "One click generates a claim pack formatted for the platform's own support ticket. You file it; we never write to your shop." },
];

function ErrorVis() {
  return (
    <div className="lp-land-leak-vis" style={{ background: "var(--disputed-bg)" }}>
      <div className="lp-card" style={{ padding: "9px 11px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <PlatformBadge platform="shopee" size={20} />
          <span style={{ fontSize: 11.5, color: "var(--disputed)" }}>commission on cancelled</span>
        </span>
        <span className="lp-money" style={{ color: "var(--disputed)", fontWeight: 600, fontSize: 13 }}>−RM12.60</span>
      </div>
    </div>
  );
}
function HoldVis() {
  return (
    <div className="lp-land-leak-vis" style={{ background: "var(--transit-bg)" }}>
      <div className="lp-card" style={{ padding: "9px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span className="lp-money" style={{ color: "var(--transit)", fontWeight: 600, fontSize: 13 }}>RM1,979.04</span>
        <span style={{ fontSize: 11.5, color: "var(--ink-2)" }}>on hold · releases 4 Jul</span>
      </div>
    </div>
  );
}
function DriftVis() {
  return (
    <div className="lp-land-leak-vis" style={{ background: "var(--fees-bg)" }}>
      <div className="lp-card" style={{ padding: "9px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: 11.5, color: "var(--ink-2)" }}>true take-rate</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--fees)", fontWeight: 600 }}>
          <span className="lp-money" style={{ fontSize: 13 }}>12.4%</span>
          <TrendingUp size={13} strokeWidth={2.25} aria-hidden />
          <span style={{ fontSize: 11, color: "var(--ink-3)" }}>from 11.1%</span>
        </span>
      </div>
    </div>
  );
}

const LEAKS = [
  { icon: AlertTriangle, c: "var(--disputed)", cb: "var(--disputed-bg)", vis: <ErrorVis />, t: "Platform errors", d: "Commission charged on cancelled orders, shipping overcharges, refunds deducted twice, settlement lines that never arrive." },
  { icon: Clock, c: "var(--transit)", cb: "var(--transit-bg)", vis: <HoldVis />, t: "Trapped holds", d: "Funds sitting in a hold state you've lost track of, with no clear release date." },
  { icon: TrendingUp, c: "var(--fees)", cb: "var(--fees-bg)", vis: <DriftVis />, t: "Fee drift", d: "Rates that quietly moved. We show your true take-rate per platform, per month." },
];

const PLATFORMS = [
  { k: "shopee", n: "Shopee" },
  { k: "tiktok", n: "TikTok Shop" },
  { k: "lazada", n: "Lazada" },
];

export default function Landing() {
  return (
    <div className="lp-land">
      <header className="lp-land-nav">
        <span className="lp-mark"><i /> PayoutCheck</span>
        <a href="/login" className="lp-btn lp-btn-ghost">Sign in</a>
      </header>

      <section className="lp-land-hero">
        <div className="lp-land-hero-copy">
          <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)" }}>See exactly where your settlement money went.</h1>
          <p className="lede" style={{ fontSize: 17 }}>
            Southeast Asian marketplaces pay in batched settlements, not per order — and money leaks through
            fees, holds, and outright errors you can&apos;t practically check. PayoutCheck reconciles every order and
            hands you the disputes worth filing.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
            <a href={INVITE_MAILTO} className="lp-btn lp-btn-primary" style={{ padding: "12px 20px" }}>
              Request an invite <ArrowRight size={16} strokeWidth={2} aria-hidden />
            </a>
            <a href="/login" className="lp-btn" style={{ padding: "12px 20px" }}>Sign in</a>
          </div>
          <p className="sub" style={{ marginTop: 8 }}>Invite-only while we onboard the first sellers.</p>
        </div>
        <div className="lp-land-hero-vis"><RibbonPreview /></div>
      </section>

      <section className="lp-land-plat">
        <span className="sub">Works with the exports you already download from</span>
        <div className="lp-land-plat-row">
          {PLATFORMS.map((p) => (
            <span key={p.k} className="lp-land-plat-item">
              <PlatformBadge platform={p.k} size={24} /> {p.n}
            </span>
          ))}
        </div>
      </section>

      <section className="lp-land-band">
        <div className="lp-land-split">
          <div className="lp-land-split-head">
            <h2 style={{ marginBottom: 10 }}>Three ways money leaks</h2>
            <p className="sub" style={{ lineHeight: 1.6, maxWidth: "30ch" }}>
              You can&apos;t audit thousands of deductions by hand. We do it per order — and show
              you exactly which leaks are worth chasing.
            </p>
          </div>
          <div className="lp-land-leak-stack">
            {LEAKS.map((l) => (
              <div key={l.t} className="lp-card lp-land-leak-card">
                <div className="lp-land-leak-body">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span className="lp-land-step-icon" style={{ background: l.cb, color: l.c }}>
                      <l.icon size={17} strokeWidth={1.9} aria-hidden />
                    </span>
                    <h3 style={{ fontSize: 16 }}>{l.t}</h3>
                  </div>
                  <p className="sub" style={{ lineHeight: 1.6 }}>{l.d}</p>
                </div>
                <div className="lp-land-leak-viswrap">{l.vis}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-land-band lp-land-how">
        <h2 style={{ marginBottom: 8 }}>How it works</h2>
        <p className="sub" style={{ marginBottom: 36, maxWidth: "40ch" }}>From a raw export to a filed claim, in three steps.</p>
        <div className="lp-land-cards">
          {STEPS.map((s, i) => (
            <div key={s.t} className="lp-card lp-land-step">
              {s.mock}
              <div style={{ padding: "18px 20px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span className="lp-land-step-icon"><s.icon size={18} strokeWidth={1.75} aria-hidden /></span>
                  <span className="lp-eyebrow">Step {i + 1}</span>
                </div>
                <h3 style={{ fontSize: 16, marginBottom: 6 }}>{s.t}</h3>
                <p className="sub" style={{ lineHeight: 1.6 }}>{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-land-cta">
        <h2 style={{ fontSize: "clamp(24px, 3vw, 34px)", marginBottom: 10 }}>Find your first leak in under 10 minutes.</h2>
        <p className="lede" style={{ margin: "0 auto 20px" }}>Upload one settlement file. See a real, recoverable ringgit number before you commit to anything.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href={INVITE_MAILTO} className="lp-btn lp-btn-primary" style={{ padding: "12px 20px" }}>Request an invite</a>
          <a href="/login" className="lp-btn" style={{ padding: "12px 20px" }}>Sign in</a>
        </div>
      </section>

      <footer className="lp-land-foot">
        <span className="lp-mark" style={{ fontSize: 14 }}><i /> PayoutCheck</span>
        <span className="sub">Read-only against marketplaces. We never ask for your Seller Centre password.</span>
      </footer>
    </div>
  );
}
