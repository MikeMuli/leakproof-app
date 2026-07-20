import * as XLSX from "xlsx";
import path from "node:path";
import { fileURLToPath } from "node:url";

const header = ["Order No.", "Transaction Date", "Order Status", "Product Name", "SKU", "Quantity", "Item Price", "Shipping Fee", "Commission", "Payment Fee", "Net Amount"];
const rows = [
  header,
  ["LZ50000001", "2026-05-18", "Delivered", "Air Fryer Liner x100", "AFL-100", "1", "120.00", "4.90", "10.80", "2.40", "101.90"],
  ["LZ50000002", "2026-06-01", "Cancelled", "Hijab Satin Premium", "HSP-01", "1", "89.00", "4.90", "8.01", "1.78", "74.31"],
];
const ws = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Transactions");
XLSX.writeFile(wb, path.join(path.dirname(fileURLToPath(import.meta.url)), "demo-lazada-transactions.xlsx"));
