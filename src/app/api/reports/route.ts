import { getAuthedUser } from "@/lib/supabase/getUser";
import { gatherReportData } from "@/lib/reports/gather";
import { buildXlsxReport } from "@/lib/reports/xlsx";
import { buildPdfReport } from "@/lib/reports/pdf";

export async function GET(request: Request) {
  const { user, supabase } = await getAuthedUser(request);
  if (!user) return Response.json({ error: "not signed in" }, { status: 401 });

  const url = new URL(request.url);
  const shopId = url.searchParams.get("shopId"); // null/absent = all shops, consolidated
  const month = url.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const format = url.searchParams.get("format") ?? "xlsx";

  if (!/^\d{4}-\d{2}$/.test(month)) return Response.json({ error: "month must be YYYY-MM" }, { status: 400 });
  if (format !== "xlsx" && format !== "pdf") return Response.json({ error: "format must be xlsx or pdf" }, { status: 400 });

  const { data: seller } = await supabase
    .from("sellers").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!seller) return Response.json({ error: "seller not bootstrapped" }, { status: 400 });

  // gatherReportData runs on the RLS-scoped client — a shopId for another seller's shop
  // simply resolves to zero shops here, never leaks their data. No extra check needed.
  const data = await gatherReportData(supabase, seller.id, shopId, month);
  const filenameBase = `leakproof-${month}${shopId ? "" : "-all-shops"}`;

  if (format === "xlsx") {
    const buf = buildXlsxReport(data);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
      },
    });
  }

  const pdfBytes = await buildPdfReport(data);
  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
    },
  });
}
