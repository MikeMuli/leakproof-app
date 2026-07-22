import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ReportData } from "./gather";

const rm = (c: number) => "RM" + (c / 100).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MARGIN = 40;
const PAGE_W = 595; // A4 width in points
const PAGE_H = 842;
const ROW_H = 16;

export async function buildPdfReport(data: ReportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const mono = await doc.embedFont(StandardFonts.Courier);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  function newPageIfNeeded(nextRowY: number) {
    if (nextRowY < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  }

  function text(str: string, x: number, size: number, font = regular, color = rgb(0.05, 0.1, 0.13)) {
    page.drawText(str, { x, y, size, font, color });
  }

  text("PayoutCheck — Monthly Statement", MARGIN, 18, bold);
  y -= 26;
  text(`Period: ${data.month}`, MARGIN, 11, regular, rgb(0.4, 0.45, 0.5));
  y -= 30;

  text("Summary", MARGIN, 13, bold);
  y -= 20;

  const cols = [MARGIN, 220, 320, 400, 500];
  const headers = ["Shop", "Settled", "Fees", "Flagged", "Recovered"];
  headers.forEach((h, i) => text(h, cols[i], 9, bold, rgb(0.45, 0.5, 0.55)));
  y -= ROW_H;

  for (const s of data.shops) {
    newPageIfNeeded(y - ROW_H);
    text(s.shopName, cols[0], 10, regular);
    text(rm(s.settledCents), cols[1], 10, mono);
    text(rm(s.feesCents), cols[2], 10, mono);
    text(rm(s.flaggedCents), cols[3], 10, mono, s.flaggedCents > 0 ? rgb(0.77, 0.24, 0.19) : undefined);
    text(rm(s.recoveredCents), cols[4], 10, mono);
    y -= ROW_H;
  }

  y -= 4;
  text("All shops", cols[0], 10, bold);
  text(rm(data.totals.settledCents), cols[1], 10, mono);
  text(rm(data.totals.feesCents), cols[2], 10, mono);
  text(rm(data.totals.flaggedCents), cols[3], 10, mono, data.totals.flaggedCents > 0 ? rgb(0.77, 0.24, 0.19) : undefined);
  text(rm(data.totals.recoveredCents), cols[4], 10, mono);
  y -= 34;

  newPageIfNeeded(y);
  text("Orders", MARGIN, 13, bold);
  y -= 20;

  const oCols = [MARGIN, 130, 220, 280, 350, 480];
  const oHeaders = ["Order ID", "Date", "Price", "Status", "Detector", "Gap"];
  oHeaders.forEach((h, i) => text(h, oCols[i], 9, bold, rgb(0.45, 0.5, 0.55)));
  y -= ROW_H;

  for (const o of data.orders) {
    newPageIfNeeded(y - ROW_H);
    text(o.platformOrderId, oCols[0], 9, mono);
    text(o.date.slice(0, 10), oCols[1], 9, regular);
    text(rm(o.priceCents), oCols[2], 9, mono);
    text(o.bucket, oCols[3], 9, regular);
    text(o.detectorType ?? "", oCols[4], 8, regular);
    text(rm(o.gapCents), oCols[5], 9, mono, o.bucket === "DISPUTABLE" ? rgb(0.77, 0.24, 0.19) : undefined);
    y -= ROW_H;
  }

  return doc.save();
}
