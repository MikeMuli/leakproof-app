import * as XLSX from "xlsx";
import path from "node:path";
import { fileURLToPath } from "node:url";

const header = ["Order ID", "Order Creation Date", "Order Status", "Product Name", "SKU", "Quantity", "Unit Price"];
const rows = [
  header,
  ["SH70000001", "2026-06-10", "Delivered", "Hijab Satin Premium", "HSP-01", "1", "89.00"],
  // multi-item order — two rows, one Order ID. The point of this file type.
  ["SH70000002", "2026-06-15", "Delivered", "Tumbler 500ml", "TM-500", "2", "39.00"],
  ["SH70000002", "2026-06-15", "Delivered", "Phone Grip Ring", "PGR-01", "1", "15.00"],
];
const ws = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Order Export");
XLSX.writeFile(wb, path.join(path.dirname(fileURLToPath(import.meta.url)), "demo-shopee-orders.xlsx"));
