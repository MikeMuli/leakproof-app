"use client";

import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import TopBar from "../../components/TopBar";
import { PageSkeleton } from "../../components/Skeletons";

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

  if (loading) return (
    <>
      <TopBar current="dashboard" isAdmin />
      <PageSkeleton />
    </>
  );

  return (
    <>
      <TopBar current="dashboard" title="Invites · admin" isAdmin />
      <main className="lp-page">
        <div className="lp-page-grid">
        <aside className="lp-page-aside">
          <h2>Invites</h2>
          <p className="sub">Create a one-time signup link for a new seller. PayoutCheck is invite-only, so this is the only way in.</p>
          <form onSubmit={createInvite} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="seller@email.com" className="lp-input" />
            <button type="submit" disabled={busy} className="lp-btn lp-btn-primary">{busy ? "…" : "Create invite"}</button>
          </form>
          {error && <p role="alert" style={{ color: "var(--disputed)", marginTop: 12, fontSize: 13 }}>{error}</p>}
        </aside>
        <div className="lp-page-main">
      {invites.map((inv) => {
        const expired = new Date(inv.expires_at) < new Date();
        const status = inv.used_at ? "used" : expired ? "expired" : "active";
        return (
          <div key={inv.id} className="lp-card" style={{ padding: 13 }}>
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
                  {copiedId === inv.id
                    ? <><Check size={14} strokeWidth={2.25} aria-hidden style={{ color: "var(--settled)" }} /> Copied</>
                    : <><Copy size={14} strokeWidth={1.75} aria-hidden /> Copy invite link</>}
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
        </div>
        </div>
      </main>
    </>
  );
}
