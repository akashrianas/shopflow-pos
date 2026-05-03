import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/protected";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as XLSX from "xlsx";
import { Download, TrendingUp, Receipt, Percent } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/reports")({ component: () => <Protected path="/reports"><Reports /></Protected> });

function Reports() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [sales, setSales] = useState<{ id: string; invoice_number: string; subtotal: number; discount: number; tax: number; total: number; payment_method: string; created_at: string }[]>([]);

  async function load() {
    const { data } = await supabase.from("sales")
      .select("id, invoice_number, subtotal, discount, tax, total, payment_method, created_at")
      .gte("created_at", from).lte("created_at", to + "T23:59:59")
      .order("created_at", { ascending: false });
    setSales(data ?? []);
  }
  useEffect(() => { load(); }, [from, to]);

  const totalRev = sales.reduce((s, x) => s + Number(x.total), 0);
  const totalTax = sales.reduce((s, x) => s + Number(x.tax), 0);
  const totalDisc = sales.reduce((s, x) => s + Number(x.discount), 0);

  const byDay = Object.entries(sales.reduce<Record<string, number>>((acc, s) => {
    const d = s.created_at.slice(0, 10);
    acc[d] = (acc[d] ?? 0) + Number(s.total);
    return acc;
  }, {})).map(([date, total]) => ({ date: date.slice(5), total })).sort((a, b) => a.date.localeCompare(b.date));

  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(sales.map((s) => ({
      Invoice: s.invoice_number, Date: new Date(s.created_at).toLocaleString(),
      Subtotal: Number(s.subtotal), Discount: Number(s.discount), Tax: Number(s.tax), Total: Number(s.total),
      Payment: s.payment_method,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales");
    XLSX.writeFile(wb, `sales-report-${from}-to-${to}.xlsx`);
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">Tax, profit & sales analytics</p>
        </div>
        <div className="flex items-end gap-2">
          <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <Button onClick={exportExcel} className="gradient-primary text-white border-0"><Download className="h-4 w-4 mr-2" />Export Excel</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass p-5">
          <div className="flex justify-between items-start"><div><div className="text-xs text-muted-foreground uppercase">Revenue</div><div className="text-3xl font-bold mt-1 gradient-text">${totalRev.toFixed(2)}</div></div><TrendingUp className="h-5 w-5 text-primary" /></div>
        </Card>
        <Card className="glass p-5">
          <div className="flex justify-between items-start"><div><div className="text-xs text-muted-foreground uppercase">Tax Collected</div><div className="text-3xl font-bold mt-1">${totalTax.toFixed(2)}</div></div><Percent className="h-5 w-5 text-primary" /></div>
        </Card>
        <Card className="glass p-5">
          <div className="flex justify-between items-start"><div><div className="text-xs text-muted-foreground uppercase">Discounts</div><div className="text-3xl font-bold mt-1">${totalDisc.toFixed(2)}</div></div><Receipt className="h-5 w-5 text-primary" /></div>
        </Card>
      </div>

      <Card className="glass p-4">
        <h2 className="font-bold mb-4">Daily Revenue</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.05)" />
              <XAxis dataKey="date" stroke="oklch(0.7 0 0)" fontSize={12} />
              <YAxis stroke="oklch(0.7 0 0)" fontSize={12} />
              <Tooltip contentStyle={{ background: "oklch(0.18 0 0)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }} />
              <Bar dataKey="total" fill="oklch(0.7 0.18 250)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="glass p-4">
        <h2 className="font-bold mb-3">Transactions ({sales.length})</h2>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background/80 backdrop-blur"><tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-2 px-2">Invoice</th><th className="py-2 px-2">Date</th>
              <th className="py-2 px-2 text-right">Subtotal</th><th className="py-2 px-2 text-right">Tax</th><th className="py-2 px-2 text-right">Total</th>
            </tr></thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-b border-border/50">
                  <td className="py-2 px-2 font-mono">{s.invoice_number}</td>
                  <td className="py-2 px-2">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="py-2 px-2 text-right">${Number(s.subtotal).toFixed(2)}</td>
                  <td className="py-2 px-2 text-right">${Number(s.tax).toFixed(2)}</td>
                  <td className="py-2 px-2 text-right font-bold">${Number(s.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
