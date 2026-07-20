import * as XLSX from "xlsx";

const header = ["Order ID","Order Creation Date","Order Status","Product Name","SKU","Quantity","Product Price","Shipping Fee","Commission Fee","Transaction Fee","Net Amount"];
const rows = [
  header,
  ["SH90000001","2026-05-10","Delivered","Hijab Satin Premium","HSP-01","1","89.00","4.90","7.57","1.78","74.75"],
  ["SH90000002","2026-05-12","Delivered","Kids Sandal 28","KS-28","2","45.00","4.90","3.83","0.90","35.37"],
  ["SH90000003","2026-06-01","Cancelled","Air Fryer Liner x100","AFL-100","1","120.00","4.90","10.20","2.40","102.50"],
  ["SH90000004","2026-06-18","Delivered","Tumbler 500ml","TM-500","1","39.00","4.90","3.32","0.78","30.00"],
];
const ws = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Income Released");
import path from "node:path";
import { fileURLToPath } from "node:url";
XLSX.writeFile(wb, path.join(path.dirname(fileURLToPath(import.meta.url)), "demo-shopee-income.xlsx"));
