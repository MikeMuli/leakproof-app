import { getAuthedUser } from "@/lib/supabase/getUser";
import { sendWeeklyDigest } from "@/lib/notifications/digest";

/** Manual trigger for testing — "send me a digest now" rather than waiting a week. */
export async function POST(request: Request) {
  const { user, supabase } = await getAuthedUser(request);
  if (!user) return Response.json({ error: "not signed in" }, { status: 401 });

  const { data: seller } = await supabase.from("sellers").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!seller) return Response.json({ error: "seller not bootstrapped" }, { status: 400 });

  const result = await sendWeeklyDigest(supabase, seller.id);
  return Response.json(result);
}
