"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import TopBar from "../components/TopBar";
import { PageSkeleton } from "../components/Skeletons";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [sellerId, setSellerId] = useState("");

  const [contactEmail, setContactEmail] = useState("");
  const [notifyDisputable, setNotifyDisputable] = useState(true);
  const [notifyDigest, setNotifyDigest] = useState(true);
  const [prefsBusy, setPrefsBusy] = useState(false);
  const [prefsStatus, setPrefsStatus] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwStatus, setPwStatus] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setLoginEmail(user.email ?? "");

      const { data: seller } = await supabase
        .from("sellers").select("id, email, notify_disputable, notify_digest")
        .eq("auth_user_id", user.id).maybeSingle();
      if (seller) {
        setSellerId(seller.id);
        setContactEmail(seller.email ?? user.email ?? "");
        setNotifyDisputable(seller.notify_disputable ?? true);
        setNotifyDigest(seller.notify_digest ?? true);
      }
      setLoading(false);
    })();
  }, [router, supabase]);

  async function savePrefs(e: React.FormEvent) {
    e.preventDefault();
    setPrefsBusy(true);
    setPrefsStatus(null);
    const { error } = await supabase.from("sellers")
      .update({ email: contactEmail, notify_disputable: notifyDisputable, notify_digest: notifyDigest })
      .eq("id", sellerId);
    setPrefsBusy(false);
    setPrefsStatus(error ? `Failed: ${error.message}` : "Saved.");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwStatus(null);
    if (newPassword !== confirmPassword) { setPwError("Passwords don't match."); return; }
    if (newPassword.length < 6) { setPwError("At least 6 characters."); return; }

    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwBusy(false);
    if (error) { setPwError(error.message); return; }
    setNewPassword(""); setConfirmPassword("");
    setPwStatus("Password changed.");
  }

  if (loading) return (
    <>
      <TopBar current="dashboard" />
      <PageSkeleton />
    </>
  );

  return (
    <>
      <TopBar current="dashboard" title="Profile" />
      <main className="lp-page">
        <div className="lp-page-grid">
        <aside className="lp-page-aside">
          <h2>Profile</h2>
          <p className="sub">Signed in as {loginEmail}. Manage where alerts reach you and your account password here.</p>
        </aside>
        <div className="lp-page-main">
        <form onSubmit={savePrefs} className="lp-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, marginBottom: 4 }}>Notifications</h3>
          <p className="sub" style={{ marginBottom: 14 }}>Where alerts and digests go, and which ones you get.</p>

          <label style={{ fontSize: 13, color: "var(--ink-2)", display: "block", marginBottom: 14 }}>
            Contact email
            <input type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
              className="lp-input" style={{ width: "100%", marginTop: 4 }} />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, marginBottom: 10 }}>
            <input type="checkbox" checked={notifyDisputable} onChange={(e) => setNotifyDisputable(e.target.checked)} />
            Email me when a new disputable item is flagged
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, marginBottom: 16 }}>
            <input type="checkbox" checked={notifyDigest} onChange={(e) => setNotifyDigest(e.target.checked)} />
            Include me in the weekly digest
          </label>

          <button type="submit" disabled={prefsBusy} className="lp-btn lp-btn-primary">{prefsBusy ? "…" : "Save"}</button>
          {prefsStatus && <span style={{ marginLeft: 10, fontSize: 13, color: "var(--ink-2)" }}>{prefsStatus}</span>}
        </form>

        <form onSubmit={changePassword} className="lp-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, marginBottom: 4 }}>Change password</h3>
          <p className="sub" style={{ marginBottom: 14 }}>You&apos;ll stay signed in on this device.</p>

          <label style={{ fontSize: 13, color: "var(--ink-2)", display: "block", marginBottom: 10 }}>
            New password
            <input type="password" required minLength={6} autoComplete="new-password" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)} className="lp-input" style={{ width: "100%", marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 13, color: "var(--ink-2)", display: "block", marginBottom: 14 }}>
            Confirm new password
            <input type="password" required minLength={6} autoComplete="new-password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} className="lp-input" style={{ width: "100%", marginTop: 4 }} />
          </label>

          {pwError && <p role="alert" style={{ color: "var(--disputed)", fontSize: 13, marginBottom: 10 }}>{pwError}</p>}
          <button type="submit" disabled={pwBusy} className="lp-btn lp-btn-primary">{pwBusy ? "…" : "Change password"}</button>
          {pwStatus && <span style={{ marginLeft: 10, fontSize: 13, color: "var(--settled)" }}>{pwStatus}</span>}
        </form>
        </div>
        </div>
      </main>
    </>
  );
}
