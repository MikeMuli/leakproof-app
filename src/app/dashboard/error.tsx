"use client";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main style={{ maxWidth: 480, margin: "90px auto", padding: "0 20px", textAlign: "center" }}>
      <h1 style={{ fontSize: 22 }}>Couldn&apos;t load your dashboard</h1>
      <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 20 }}>
        Something went wrong reading your data. Your numbers are safe — this is a display error, not a data loss.
      </p>
      <button onClick={reset} className="lp-btn lp-btn-primary">Try again</button>
      {error.digest && <p className="sub" style={{ marginTop: 16 }}>Reference: {error.digest}</p>}
    </main>
  );
}
