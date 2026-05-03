import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/protected";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const Route = createFileRoute("/customers")({ component: () => <Protected path="/customers"><Customers /></Protected> });

function tier(pts: number) {
  if (pts >= 2000) return { name: "Gold", cls: "bg-warning text-warning-foreground" };
  if (pts >= 500) return { name: "Silver", cls: "bg-muted text-foreground" };
  return { name: "Bronze", cls: "bg-accent/40 text-foreground" };
}

function Customers() {
  const [list, setList] = useState<{ id: string; name: string; phone: string | null; email: string | null; loyalty_points: number; total_spent: number; visit_count: number }[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => { supabase.from("customers").select("*").order("created_at", { ascending: false }).then(({ data }) => setList(data ?? [])); }, []);
  const ql = q.toLowerCase();
  const filtered = list.filter((c) => c.name.toLowerCase().includes(ql) || (c.phone ?? "").toLowerCase().includes(ql) || (c.email ?? "").toLowerCase().includes(ql));

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap gap-4 items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1">{filtered.length} of {list.length} customers • Bronze / Silver / Gold</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, email…" className="pl-9" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => {
          const t = tier(c.loyalty_points);
          return (
            <Card key={c.id} className="glass p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.phone ?? c.email ?? "—"}</div>
                </div>
                <Badge className={t.cls}>{t.name}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div><div className="text-lg font-bold">${Number(c.total_spent).toFixed(0)}</div><div className="text-xs text-muted-foreground">Spent</div></div>
                <div><div className="text-lg font-bold">{c.visit_count}</div><div className="text-xs text-muted-foreground">Visits</div></div>
                <div><div className="text-lg font-bold gradient-text">{c.loyalty_points}</div><div className="text-xs text-muted-foreground">Points</div></div>
              </div>
            </Card>
          );
        })}
        {list.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12">No customers yet — add at POS checkout</div>}
      </div>
    </div>
  );
}
