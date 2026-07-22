"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, Upload, Store, FileText, User, Mail, ShieldAlert,
  Send, LogOut, MoreHorizontal, type LucideIcon,
} from "lucide-react";

export type Section = "dashboard" | "upload" | "shops" | "reports" | "onboarding";

const NAV: { key: Section; label: string; href: string; icon: LucideIcon }[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "upload", label: "Upload", href: "/upload", icon: Upload },
  { key: "shops", label: "Shops", href: "/shops", icon: Store },
  { key: "reports", label: "Reports", href: "/reports", icon: FileText },
];

/**
 * Persistent, sticky app shell used on every authenticated page. Before this, only the
 * dashboard had any chrome at all — every other screen was a bare <main> floating on the
 * background with a single "← Dashboard" link as its only anchor. This is what fixes that:
 * the brand mark, current-section context, and primary nav are always present, so no page
 * is ever an island.
 */
export default function TopBar({
  current, title, isAdmin = false, quarantineCount = 0, variant = "full",
}: {
  current: Section;
  title?: string;
  isAdmin?: boolean;
  quarantineCount?: number;
  variant?: "full" | "light";
}) {
  const router = useRouter();
  const supabase = createClient();
  const [digestStatus, setDigestStatus] = useState<string | null>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current?.open && !menuRef.current.contains(e.target as Node)) menuRef.current.open = false;
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function sendDigestNow() {
    setDigestStatus("Sending…");
    const res = await fetch("/api/notifications/digest", { method: "POST" });
    const json = await res.json();
    setDigestStatus(json.ok ? "Sent — check your email." : `Failed: ${json.errors?.join("; ") ?? json.error}`);
  }

  return (
    <>
      <header className="lp-topbar">
        <div className="lp-topbar-in">
          <a href={variant === "light" ? "/" : "/dashboard"} className="lp-mark" style={{ flexShrink: 0 }}>
            <i /> PayoutCheck
          </a>
          {title && <span className="lp-topbar-title">{title}</span>}
          <span style={{ flex: 1 }} />

          {variant === "full" && (
            <>
              <nav className="lp-nav">
                {NAV.map((n) => (
                  <a key={n.key} href={n.href} className={`lp-nav-link ${current === n.key ? "active" : ""}`}>
                    <n.icon size={16} strokeWidth={1.75} aria-hidden />
                    {n.label}
                  </a>
                ))}
              </nav>
              <details className="lp-menu" ref={menuRef}>
                <summary className="lp-btn lp-btn-ghost lp-menu-trigger" aria-label="More actions">
                  <MoreHorizontal size={18} strokeWidth={2} aria-hidden />
                </summary>
                <div className="lp-menu-panel">
                  <a href="/dashboard" className="lp-menu-item lp-nav-only-mobile"><LayoutDashboard size={16} strokeWidth={1.75} aria-hidden /> Dashboard</a>
                  <a href="/upload" className="lp-menu-item lp-nav-only-mobile"><Upload size={16} strokeWidth={1.75} aria-hidden /> Upload</a>
                  <a href="/shops" className="lp-menu-item lp-nav-only-mobile"><Store size={16} strokeWidth={1.75} aria-hidden /> Shops</a>
                  <a href="/reports" className="lp-menu-item lp-nav-only-mobile"><FileText size={16} strokeWidth={1.75} aria-hidden /> Reports</a>
                  <div className="lp-menu-divider lp-nav-only-mobile" />
                  <a href="/profile" className="lp-menu-item"><User size={16} strokeWidth={1.75} aria-hidden /> Profile</a>
                  {isAdmin && (
                    <a href="/admin/invites" className="lp-menu-item">
                      <Mail size={16} strokeWidth={1.75} aria-hidden /> Invites
                      <span className="lp-badge" style={{ background: "var(--transit-bg)", color: "var(--transit)", marginLeft: "auto" }}>admin</span>
                    </a>
                  )}
                  {isAdmin && (
                    <a href="/admin/quarantine" className="lp-menu-item">
                      <ShieldAlert size={16} strokeWidth={1.75} aria-hidden /> Quarantine queue
                      <span className="lp-badge" style={{ background: "var(--transit-bg)", color: "var(--transit)", marginLeft: "auto" }}>admin</span>
                    </a>
                  )}
                  <button onClick={sendDigestNow} className="lp-menu-item"><Send size={16} strokeWidth={1.75} aria-hidden /> {digestStatus ?? "Send weekly digest now"}</button>
                  <div className="lp-menu-divider" />
                  <button onClick={signOut} className="lp-menu-item" style={{ color: "var(--disputed)" }}><LogOut size={16} strokeWidth={1.75} aria-hidden /> Sign out</button>
                </div>
              </details>
            </>
          )}
        </div>
      </header>

      {isAdmin && quarantineCount > 0 && (
        <div className="lp-shell" style={{ paddingTop: 16 }}>
          <a href="/admin/quarantine" className="lp-card" style={{
            display: "block", background: "var(--fees-bg)", borderColor: "var(--fees)", color: "var(--fees)",
            padding: "11px 15px", fontSize: 13.5, fontWeight: 540,
          }}>
            {quarantineCount} upload{quarantineCount > 1 ? "s" : ""} couldn&apos;t be read — needs a parser fix →
          </a>
        </div>
      )}
    </>
  );
}
