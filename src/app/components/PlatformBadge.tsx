const PLATFORM_META: Record<string, { letter: string; bg: string; fg: string; label: string }> = {
  shopee: { letter: "S", bg: "#FDE9E4", fg: "#D5491F", label: "Shopee" },
  tiktok: { letter: "T", bg: "#E8EAED", fg: "#111318", label: "TikTok Shop" },
  lazada: { letter: "L", bg: "#E7E8F7", fg: "#2A3399", label: "Lazada" },
};

/**
 * Small colored monogram, not a traced logo — real platform brand colors for fast
 * recognition when a seller has several shops mixed in one list, without reproducing
 * anyone's actual logotype.
 */
export default function PlatformBadge({ platform, size = 20 }: { platform: string; size?: number }) {
  const meta = PLATFORM_META[platform] ?? { letter: "?", bg: "var(--surface-sunk)", fg: "var(--ink-3)", label: platform };
  return (
    <span
      role="img"
      aria-label={meta.label}
      title={meta.label}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: size, height: size, borderRadius: size * 0.3,
        background: meta.bg, color: meta.fg,
        fontSize: size * 0.55, fontWeight: 700, fontFamily: "var(--font-display)",
        flexShrink: 0, lineHeight: 1,
      }}
    >
      {meta.letter}
    </span>
  );
}
