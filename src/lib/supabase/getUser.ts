import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "./server";

/**
 * Resolves the authenticated user from either an Authorization: Bearer token (API/script
 * clients) or the session cookie (browser). Route handlers should use this instead of
 * calling the cookie-based server client directly, so the same endpoint works for both.
 */
export async function getAuthedUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length);
    const anon = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data, error } = await anon.auth.getUser(token);
    if (error || !data.user) return { user: null, supabase: anon };
    // Re-create a client with the token set so RLS-scoped queries run as this user.
    const scoped = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    return { user: data.user, supabase: scoped };
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
}
