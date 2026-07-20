import * as XLSX from "xlsx";
import path from "node:path";
import { fileURLToPath } from "node:url";

const header = ["Order ID", "Order Creation Date", "Order Status", "Product Name", "SKU", "Quantity", "Product Price", "Shipping Fee", "Commission Fee", "Transaction Fee", "Net Amount"];
const rows = [
  header,
  // Cancelled, high value — commission+txn well over the RM10 alert threshold.
  ["SH99900001", "2026-06-01", "Cancelled", "Air Fryer Liner x100", "AFL-100", "1", "500.00", "4.90", "42.50", "10.00", "442.60"],
];
const ws = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Income Released");
XLSX.writeFile(wb, path.join(path.dirname(fileURLToPath(import.meta.url)), "demo-big-dispute.xlsx"));
