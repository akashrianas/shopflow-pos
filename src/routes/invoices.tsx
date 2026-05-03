import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/protected";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const Route = createFileRoute("/invoices")({ component: () => <Protected path="/invoices"><Invoices /></Protected> });

function Invoices() {
  const [list, setList] = useState<{ id: string; invoice_number: string; total: number; payment_method: string; created_at: string }[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => { supabase.from("sales").select("id, invoice_number, total, payment_method, created_at").order("created_at", { ascending: false }).limit(200).then(({ data }) => setList(data ?? [])); }, []);
  const rows = list.filter((s) => s.invoice_number.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground mt-1">All sales</p>
      </div>
      <Card className="glass p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search invoice #" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 max-w-md" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-2 px-2">Invoice</th><th className="py-2 px-2">Date</th>
              <th className="py-2 px-2">Payment</th><th className="py-2 px-2 text-right">Total</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/50">
                  <td className="py-2.5 px-2 font-mono">{r.invoice_number}</td>
                  <td className="py-2.5 px-2">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="py-2.5 px-2 capitalize">{r.payment_method}</td>
                  <td className="py-2.5 px-2 text-right font-bold">${Number(r.total).toFixed(2)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No invoices</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
