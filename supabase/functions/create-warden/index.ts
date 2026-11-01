import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ADMIN_KEY = "hostel-mess-admin-2026";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { adminKey, email, password, hostelName } = await req.json();

    if (!adminKey || adminKey !== ADMIN_KEY) {
      return new Response(
        JSON.stringify({ error: "Invalid admin key. Only the app owner can create wardens." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email || !password || !hostelName) {
      return new Response(
        JSON.stringify({ error: "Email, password, and hostel name are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if hostel already exists
    const { data: existingHostel } = await adminClient
      .from("hostels")
      .select("id, name")
      .eq("name", hostelName.trim())
      .maybeSingle();

    let hostelId: string;

    if (existingHostel) {
      hostelId = (existingHostel as { id: string }).id;
    } else {
      const { data: newHostel, error: hostelError } = await adminClient
        .from("hostels")
        .insert({ name: hostelName.trim() })
        .select()
        .single();

      if (hostelError) {
        return new Response(
          JSON.stringify({ error: hostelError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      hostelId = (newHostel as { id: string }).id;
    }

    // Create the warden auth account
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wardenUserId = authData.user.id;

    // Insert the warden row
    const { error: wardenError } = await adminClient.from("wardens").insert({
      id: wardenUserId,
      hostel_id: hostelId,
    });

    if (wardenError) {
      // Clean up the auth user if insert fails
      await adminClient.auth.admin.deleteUser(wardenUserId);
      return new Response(
        JSON.stringify({ error: wardenError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, wardenId: wardenUserId, hostelId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
