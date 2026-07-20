"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();
  const inviteCode = params.get("invite");
  const invitedEmail = params.get("email");

  const [email, setEmail] = useState(invitedEmail ?? "");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">(inviteCode ? "signup" : "signin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (invitedEmail) setEmail(invitedEmail);
  }, [invitedEmail]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    if (mode === "signup") {
      const res = await fetch("/api/auth/signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, inviteCode }),
      });
      const json = await res.json();
      if (json.error) { setBusy(false); setError(json.error); return; }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 380, margin: "90px auto", padding: "0 20px" }}>
      <span className="lp-mark" style={{ marginBottom: 4 }}><i /> LeakProof</span>
      <p style={{ color: "var(--ink-2)", marginBottom: 26, fontSize: 14 }}>
        {mode === "signup" ? "Create your account" : "Sign in"}
      </p>

      {mode === "signup" && !inviteCode && (
        <p style={{ color: "var(--disputed)", fontSize: 13, marginBottom: 16 }}>
          LeakProof is invite-only right now. You need an invite link to create an account.
        </p>
      )}

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ fontSize: 13, color: "var(--ink-2)" }}>
          Email
          <input type="email" required value={email} autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            readOnly={mode === "signup" && !!invitedEmail}
            className="lp-input" style={{ width: "100%", marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 13, color: "var(--ink-2)" }}>
          Password
          <div style={{ position: "relative", marginTop: 4 }}>
            <input type={showPassword ? "text" : "password"} required value={password} minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              onChange={(e) => setPassword(e.target.value)} className="lp-input" style={{ width: "100%", paddingRight: 64 }} />
            <button type="button" onClick={() => setShowPassword((v) => !v)}
              style={{ position: "absolute", right: 4, top: 4, bottom: 4, padding: "0 10px", background: "none", border: "none", color: "var(--ink-3)", fontSize: 12.5, cursor: "pointer" }}
              aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {mode === "signup" && <span style={{ display: "block", fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>At least 6 characters.</span>}
        </label>
        {error && <p style={{ color: "var(--disputed)", fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={busy || (mode === "signup" && !inviteCode)} className="lp-btn lp-btn-primary" style={{ padding: "10px 16px" }}>
          {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      {mode === "signin" && (
        <p style={{ marginTop: 14, fontSize: 13, color: "var(--ink-3)" }}>
          New here? You&apos;ll need an invite link from your LeakProof contact.
        </p>
      )}
      {mode === "signup" && (
        <button onClick={() => setMode("signin")} className="lp-btn lp-btn-ghost" style={{ marginTop: 14 }}>
          Already have an account? Sign in
        </button>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
