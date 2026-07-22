import PlatformBadge from "./PlatformBadge";

/**
 * The right-hand panel of the split auth screen. Instead of a stock team photo (off-brand
 * for a fintech trust tool, and dishonest as "your data"), it's a calm preview of the
 * actual product — the settlement ribbon + a flagged order card — on the brand gradient.
 * Illustrative sample figures, clearly a product preview, never claimed as the user's data.
 */
export default function AuthShowcase() {
  const seg = [
    { l: "Settled", w: 68, c: "var(--settled)" },
    { l: "Fees", w: 22, c: "var(--fees)" },
    { l: "Disputable", w: 10, c: "var(--disputed)" },
  ];
  return (
    <div className="lp-auth-show">
      <div className="lp-show-inner">
        <h2 className="lp-show-head">See exactly where every ringgit went.</h2>
        <p className="lp-show-sub">
          Connect your Shopee, TikTok Shop and Lazada settlements. We reconcile every order
          against every deduction and hand you the disputes worth filing.
        </p>

        <div className="lp-card lp-show-card">
          <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 560, marginBottom: 10 }}>Where your RM24,180 went</div>
          <div style={{ display: "flex", height: 40, borderRadius: 10, overflow: "hidden", background: "var(--surface-sunk)" }}>
            {seg.map((s) => <div key={s.l} style={{ flexBasis: `${s.w}%`, background: s.c }} />)}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 12, color: "var(--ink-2)", flexWrap: "wrap" }}>
            {seg.map((s) => (
              <span key={s.l} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: s.c }} /> {s.l}
              </span>
            ))}
          </div>
        </div>

        <div className="lp-card lp-show-card lp-show-float">
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

        <div className="lp-show-chip">
          <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--settled)", display: "inline-block" }} />
          RM840.20 recovered so far this quarter
        </div>
      </div>
    </div>
  );
}
