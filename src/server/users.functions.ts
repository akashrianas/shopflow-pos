import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type Role = "admin" | "manager" | "salesman";

function admin() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Response("Forbidden: admin only", { status: 403 });
}

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = admin();
    const { data: list, error } = await sb.auth.admin.listUsers({ perPage: 200 });
    if (error) throw new Response(error.message, { status: 500 });
    const ids = list.users.map((u) => u.id);
    if (ids.length === 0) return { users: [] };
    const [{ data: roles }, { data: profiles }] = await Promise.all([
      sb.from("user_roles").select("user_id, role").in("user_id", ids),
      sb.from("profiles").select("id, full_name").in("id", ids),
    ]);
    return {
      users: list.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        full_name: profiles?.find((p) => p.id === u.id)?.full_name ?? null,
        role: (roles?.find((r) => r.user_id === u.id)?.role ?? "salesman") as Role,
        status: u.email_confirmed_at || (u as any).confirmed_at ? "active" : "invited",
        last_sign_in_at: u.last_sign_in_at ?? null,
      })),
    };
  });

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { email: string; password: string; full_name: string; role: Role }) => data,
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = admin();
    const { data: created, error } = await sb.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user)
      throw new Response(error?.message ?? "Failed to create user", { status: 400 });
    // Override default role from trigger
    await sb.from("user_roles").delete().eq("user_id", created.user.id);
    const { error: rErr } = await sb
      .from("user_roles")
      .insert({ user_id: created.user.id, role: data.role });
    if (rErr) throw new Response(rErr.message, { status: 400 });
    return {
      user: {
        id: created.user.id,
        email: created.user.email,
        created_at: created.user.created_at,
        full_name: data.full_name || null,
        role: data.role,
        status:
          created.user.email_confirmed_at || (created.user as any).confirmed_at
            ? "active"
            : "invited",
        last_sign_in_at: created.user.last_sign_in_at ?? null,
      },
    };
  });

export const adminSetUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { user_id: string; role: Role }) => data)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = admin();
    await sb.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await sb
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role });
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { user_id: string }) => data)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.user_id === context.userId)
      throw new Response("Cannot delete yourself", { status: 400 });
    const sb = admin();
    const { error } = await sb.auth.admin.deleteUser(data.user_id);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });
