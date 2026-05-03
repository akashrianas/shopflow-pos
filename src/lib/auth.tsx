import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type Role = "admin" | "manager" | "salesman";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  role: Role | null;
  fullName: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null, session: null, role: null, fullName: null, loading: true, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => fetchProfile(s.user.id), 0);
      } else {
        setRole(null); setFullName(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) fetchProfile(data.session.user.id);
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const [{ data: rolesData }, { data: profileData }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    ]);
    const roles = (rolesData ?? []).map((r) => r.role as Role);
    const r: Role | null = roles.includes("admin") ? "admin" : roles.includes("manager") ? "manager" : roles.includes("salesman") ? "salesman" : null;
    setRole(r);
    setFullName(profileData?.full_name ?? null);
    setLoading(false);
  }

  return (
    <Ctx.Provider value={{
      user: session?.user ?? null, session, role, fullName, loading,
      signOut: async () => { await supabase.auth.signOut(); },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

export const ROLE_ACCESS: Record<string, Role[]> = {
  "/dashboard": ["admin", "manager", "salesman"],
  "/pos": ["admin", "manager", "salesman"],
  "/products": ["admin", "manager"],
  "/invoices": ["admin", "manager"],
  "/customers": ["admin", "manager"],
  "/inventory": ["admin", "manager", "salesman"],
  "/returns": ["admin", "manager"],
  "/staff": ["admin"],
  "/reports": ["admin", "manager"],
  "/settings": ["admin"],
};
