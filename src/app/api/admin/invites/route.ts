import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { generateInviteCode } from "@/lib/invites";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return null;
  return user;
}

export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: "not authorized" }, { status: 403 });
  const admin = createAdminClient();
  const { data, error } = await admin.from("invites").select("*").order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ invites: data });
}

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return Response.json({ error: "not authorized" }, { status: 403 });

  const { email } = await request.json();
  if (!email) return Response.json({ error: "email required" }, { status: 400 });

  const admin = createAdminClient();
  const code = generateInviteCode();
  const { data, error } = await admin
    .from("invites")
    .insert({ email, code, created_by: user.email })
    .select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ invite: data });
}
