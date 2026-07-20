import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

const SLA_HOURS = 48; // PRD A1: target turnaround from quarantine to a shipped parser version

export default async function QuarantinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");

  // Deliberately crosses tenant boundaries — this is an internal ops view, not a seller
  // view, which is why it goes through the service-role client rather than the RLS-scoped
  // one. Gated above by the allowlist check; nothing here is reachable by a seller account.
  const admin = createAdminClient();
  const { data: quarantined, error } = await admin
    .from("raw_ingests")
    .select("id, file_path, header_fingerprint, ingested_at, quarantine_reason, sellers(email)")
    .eq("status", "quarantined")
    .order("ingested_at", { ascending: false });

  if (error) {
    return <main style={{ padding: 40 }}>Failed to load: {error.message}</main>;
  }

  const now = Date.now();

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "44px 20px 90px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Quarantined uploads</h1>
        <a href="/dashboard" className="lp-btn lp-btn-ghost" style={{ fontSize: 13 }}>← Dashboard</a>
      </div>
      <p style={{ color: "var(--ink-2)", marginBottom: 22, fontSize: 14 }}>
        Files no parser recognized. Each one needs either a new parser version or a fix
        within {SLA_HOURS}h — a wrong number is worse than a hard failure.
      </p>

      {(!quarantined || quarantined.length === 0) && <p style={{ color: "var(--ink-3)" }}>Nothing quarantined. Good.</p>}

      {quarantined?.map((q) => {
        const ageHours = (now - Date.parse(q.ingested_at)) / 3_600_000;
        const overdue = ageHours > SLA_HOURS;
        const seller = Array.isArray(q.sellers) ? q.sellers[0] : q.sellers;
        return (
          <div key={q.id} className="lp-card" style={{
            padding: 15, marginBottom: 10,
            background: overdue ? "var(--disputed-bg)" : "var(--surface)",
            borderColor: overdue ? "var(--disputed)" : "var(--line)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
              <b>{q.file_path}</b>
              <span style={{ color: overdue ? "var(--disputed)" : "var(--ink-3)", fontSize: 13, fontWeight: overdue ? 700 : 400 }}>
                {ageHours.toFixed(1)}h ago{overdue ? " — overdue" : ""}
              </span>
            </div>
            <p style={{ color: "var(--ink-2)", fontSize: 13, margin: "4px 0" }}>
              seller: {seller?.email ?? "unknown"} · {q.quarantine_reason}
            </p>
            {q.header_fingerprint && (
              <pre style={{ background: "var(--surface-sunk)", padding: 9, borderRadius: "var(--radius-sm)", fontSize: 12, overflowX: "auto", margin: 0, fontFamily: "var(--font-mono)" }}>
                {JSON.stringify(q.header_fingerprint)}
              </pre>
            )}
          </div>
        );
      })}
    </main>
  );
}
