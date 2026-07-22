/**
 * Content-shaped loading placeholders. Replaces the bare "Loading…" text flash between
 * interfaces — the page's shape is drawn immediately, then real content fills it, so there's
 * no blink and no layout jump. Shimmer is pure CSS; on a frozen/hidden tab it simply rests
 * as a static gray block (still visible), never a blank screen.
 */
export function Skel({ w = "100%", h = 14, r = 8, style }: { w?: number | string; h?: number; r?: number; style?: React.CSSProperties }) {
  return <div className="lp-skel" style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden />;
}

/** Skeleton for the two-column settings pages (Profile / Reports / Shops / Invites / Upload). */
export function PageSkeleton() {
  return (
    <main className="lp-page" aria-busy="true" aria-label="Loading">
      <div className="lp-page-grid">
        <aside className="lp-page-aside">
          <Skel w={160} h={22} r={7} style={{ marginBottom: 12 }} />
          <Skel w="90%" h={12} style={{ marginBottom: 6 }} />
          <Skel w="75%" h={12} />
        </aside>
        <div className="lp-page-main">
          <div className="lp-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <Skel w={120} h={14} />
            <Skel h={44} r={10} />
            <Skel h={44} r={10} />
            <Skel w={120} h={44} r={10} />
          </div>
          <div className="lp-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <Skel w={140} h={14} />
            <Skel h={44} r={10} />
          </div>
        </div>
      </div>
    </main>
  );
}
