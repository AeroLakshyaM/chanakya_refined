import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405);

  try {
    const { confirmation } = await request.json();
    if (confirmation !== "DELETE MY ACCOUNT") return respond({ error: "The account deletion confirmation did not match." }, 400);

    const authorization = request.headers.get("Authorization");
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!token || !supabaseUrl || !anonKey || !serviceRoleKey) return respond({ error: "Account deletion is not configured. Contact workspace support." }, 503);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) return respond({ error: "Your session could not be verified. Sign in again and retry." }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { error: deletionError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deletionError) {
      console.error("Account deletion failed for verified user:", deletionError.message);
      return respond({ error: "The account could not be deleted. Please contact workspace support." }, 500);
    }
    return respond({ success: true });
  } catch (error) {
    console.error("Unexpected account deletion error:", error);
    return respond({ error: "The account could not be deleted. Please try again." }, 500);
  }
});

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
