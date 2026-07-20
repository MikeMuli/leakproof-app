"use client";

import { useEffect, useState } from "react";

interface Invite {
  id: string; email: string; code: string; created_at: string; used_at: string | null; expires_at: string;
}

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/invites");
    if (res.status === 403) { setError("Not authorized — add your email to ADMIN_EMAILS."); setLoading(false); return; }
    const json = await res.json();
    setInvites(json.invites ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/invites", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
    });
    const json = await res.json();
    setBusy(false);
    if (json.error) { setError(json.error); return; }
    setEmail("");
    load();
  }

  function inviteLink(invite: Invite) {
    return `${window.location.origin}/login?invite=${invite.code}&email=${encodeURIComponent(invite.email)}`;
  }

  function copy(invite: Invite) {
    navigator.clipboard.writeText(inviteLink(invite));
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  if (loading) return <main style={{ padding: 40 }}>Loading…</main>;

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "44px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 22 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Invites</h1>
        <a href="/dashboard" className="lp-btn lp-btn-ghost" style={{ fontSize: 13 }}>← Dashboard</a>
      </div>

      {error && <p style={{ color: "var(--disputed)", marginBottom: 16 }}>{error}</p>}

      <form onSubmit={createInvite} style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="seller@email.com" className="lp-input" style={{ flex: 1 }} />
        <button type="submit" disabled={busy} className="lp-btn lp-btn-primary">{busy ? "…" : "Create invite"}</button>
      </form>

      {invites.map((inv) => {
        const expired = new Date(inv.expires_at) < new Date();
        const status = inv.used_at ? "used" : expired ? "expired" : "active";
        return (
          <div key={inv.id} className="lp-card" style={{ padding: 13, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <b>{inv.email}</b>
                <span style={{
                  marginLeft: 10, fontSize: 11, padding: "2px 8px", borderRadius: 99,
                  background: status === "active" ? "var(--settled-bg)" : "var(--surface-sunk)",
                  color: status === "active" ? "var(--settled)" : "var(--ink-3)",
                }}>{status}</span>
              </div>
              {status === "active" && (
                <button onClick={() => copy(inv)} className="lp-btn" style={{ fontSize: 12.5 }}>
                  {copiedId === inv.id ? "Copied ✓" : "Copy invite link"}
                </button>
              )}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>
              created {new Date(inv.created_at).toLocaleDateString()} · expires {new Date(inv.expires_at).toLocaleDateString()}
              {inv.used_at && ` · used ${new Date(inv.used_at).toLocaleDateString()}`}
            </div>
          </div>
        );
      })}
      {invites.length === 0 && !error && <p style={{ color: "var(--ink-3)" }}>No invites yet.</p>}
    </main>
  );
}
