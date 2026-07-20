import * as XLSX from "xlsx";
import type { ReportData } from "./gather";

const rm = (c: number) => c / 100;

export function buildXlsxReport(data: ReportData): Buffer {
  const wb = XLSX.utils.book_new();

  const summaryRows = [
    ["LeakProof — Monthly Statement", data.month],
    [],
    ["Shop", "Settled (RM)", "Fees (RM)", "Flagged/disputable (RM)", "Recovered (RM)"],
    ...data.shops.map((s) => [s.shopName, rm(s.settledCents), rm(s.feesCents), rm(s.flaggedCents), rm(s.recoveredCents)]),
    [],
    ["All shops", rm(data.totals.settledCents), rm(data.totals.feesCents), rm(data.totals.flaggedCents), rm(data.totals.recoveredCents)],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  const orderRows = [
    ["Shop", "Order ID", "Date", "Price (RM)", "Commission (RM)", "Transaction fee (RM)", "Shipping (RM)", "Voucher (RM)", "Status", "Detector", "Gap (RM)"],
    ...data.orders.map((o) => [
      o.shopName, o.platformOrderId, o.date, rm(o.priceCents), rm(o.commissionCents), rm(o.transactionFeeCents),
      rm(o.shippingCents), rm(o.voucherCents), o.bucket, o.detectorType ?? "", rm(o.gapCents),
    ]),
  ];
  const orderSheet = XLSX.utils.aoa_to_sheet(orderRows);
  XLSX.utils.book_append_sheet(wb, orderSheet, "Orders");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
