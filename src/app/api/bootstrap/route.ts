import { getAuthedUser } from "@/lib/supabase/getUser";

/**
 * Ensures the signed-in auth user has a `sellers` row. No longer auto-provisions a shop —
 * shop creation is now an explicit action on /shops (PRD E5 territory: don't create things
 * on the seller's behalf without asking). Callers that need a shopId should send the
 * seller to /shops first if the returned shopCount is 0.
 */
export async function POST(request: Request) {
  const { user, supabase } = await getAuthedUser(request);
  if (!user) return Response.json({ error: "not signed in" }, { status: 401 });

  let { data: seller } = await supabase
    .from("sellers").select("id").eq("auth_user_id", user.id).maybeSingle();

  if (!seller) {
    const { data: created, error } = await supabase
      .from("sellers").insert({ auth_user_id: user.id, email: user.email ?? "" }).select("id").single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    seller = created;
  }

  const { count } = await supabase
    .from("shops").select("id", { count: "exact", head: true }).eq("seller_id", seller!.id);

  return Response.json({ sellerId: seller!.id, shopCount: count ?? 0 });
}
