import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, ROLE_ACCESS, type Role } from "@/lib/auth";
import { AppShell } from "./app-shell";

export function Protected({ path, children }: { path: string; children: ReactNode }) {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    const allowed = ROLE_ACCESS[path] ?? [];
    if (role && !allowed.includes(role as Role)) navigate({ to: "/dashboard" });
  }, [user, role, loading, path, navigate]);

  if (loading || !user || !role) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading...</div>;
  }
  return <AppShell>{children}</AppShell>;
}
