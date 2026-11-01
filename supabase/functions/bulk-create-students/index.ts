import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { students, hostelId, wardenUserId } = await req.json();

    if (!students || !Array.isArray(students) || !hostelId || !wardenUserId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the caller is a warden of this hostel
    const { data: warden, error: wardenError } = await adminClient
      .from("wardens")
      .select("hostel_id")
      .eq("id", wardenUserId)
      .eq("hostel_id", hostelId)
      .maybeSingle();

    if (wardenError || !warden) {
      return new Response(
        JSON.stringify({ error: "Not authorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const domain = "wisdomhomes.in";
    const results: Array<{ name: string; email: string; password: string; status: string; error?: string }> = [];
    const usedSlugs = new Set<string>();

    // Get existing auth user emails to avoid collisions
    const { data: existingUsers } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });
    const existingEmails = new Set(
      (existingUsers?.users || []).map((u) => u.email?.toLowerCase() || "")
    );

    for (const rawName of students) {
      const fullName = String(rawName).trim();
      if (!fullName) continue;

      let base = slugify(fullName);
      if (!base) base = "student";

      let slug = base;
      let suffix = 1;
      while (usedSlugs.has(slug) || existingEmails.has(`${slug}@${domain}`)) {
        slug = `${base}${suffix}`;
        suffix++;
      }
      usedSlugs.add(slug);

      const email = `${slug}@${domain}`;
      const password = "Wh@2026student!";

      // Create auth user
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) {
        results.push({ name: fullName, email, password, status: "failed", error: authError.message });
        continue;
      }

      const studentUserId = authData.user.id;

      // Insert student row
      const { error: insertError } = await adminClient.from("students").insert({
        id: studentUserId,
        hostel_id: hostelId,
        full_name: fullName,
      });

      if (insertError) {
        await adminClient.auth.admin.deleteUser(studentUserId);
        results.push({ name: fullName, email, password, status: "failed", error: insertError.message });
        continue;
      }

      results.push({ name: fullName, email, password, status: "created" });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
