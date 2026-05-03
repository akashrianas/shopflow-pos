import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useAuth, ROLE_ACCESS, type Role } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { LayoutDashboard, ShoppingCart, Package, Users, Boxes, FileText, Undo2, UserCog, BarChart3, Settings, LogOut, Moon, Sun, Store } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pos", label: "POS Terminal", icon: ShoppingCart },
  { to: "/products", label: "Products", icon: Package },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/returns", label: "Returns", icon: Undo2 },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/staff", label: "Staff", icon: UserCog },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, fullName, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const items = NAV.filter((n) => role && (ROLE_ACCESS[n.to] ?? []).includes(role as Role));

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="p-5 border-b border-sidebar-border flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg gradient-primary grid place-items-center text-white">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold tracking-tight">Supershop</div>
            <div className="text-xs text-muted-foreground">POS & Management</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((it) => {
            const active = path.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link key={it.to} to={it.to} className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "text-sidebar-primary-foreground" : "hover:bg-sidebar-accent text-sidebar-foreground"}`}>
                {active && (
                  <motion.div layoutId="active-nav" className="absolute inset-0 gradient-primary rounded-lg" transition={{ type: "spring", stiffness: 350, damping: 30 }} />
                )}
                <Icon className="h-4 w-4 relative z-10" />
                <span className="relative z-10">{it.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="px-3 py-2 text-xs">
            <div className="font-medium truncate">{fullName ?? "User"}</div>
            <div className="text-muted-foreground capitalize">{role ?? "—"}</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={toggle}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={async () => { await signOut(); navigate({ to: "/login" }); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
