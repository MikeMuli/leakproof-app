export const PLATFORMS = ["shopee", "tiktok", "lazada"] as const;
export type PlatformKey = (typeof PLATFORMS)[number];

export const EXPORT_HELP: Record<PlatformKey, { where: string; steps: string[] }> = {
  shopee: {
    where: "Shopee Seller Centre",
    steps: [
      "Go to Finance → Income → Income Released.",
      "Pick the date range you want reconciled.",
      "Export as XLSX — that's the file to upload here.",
    ],
  },
  tiktok: {
    where: "TikTok Shop Seller Center",
    steps: [
      "Go to Finance → Statements.",
      "Select the settlement period.",
      "Export as CSV — that's the file to upload here.",
    ],
  },
  lazada: {
    where: "Lazada Seller Center",
    steps: [
      "Go to Wallet → Transaction Statement.",
      "Select the period you want reconciled.",
      "Export as XLSX — that's the file to upload here.",
    ],
  },
};

export function platformLabel(p: string): string {
  return p === "shopee" ? "Shopee" : p === "tiktok" ? "TikTok Shop" : p === "lazada" ? "Lazada" : p;
}
