import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/protected";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Card } from "@/components/ui/card";
import { DollarSign, ShoppingBag, Users, Package, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid } from "recharts";

export const Route = createFileRoute("/dashboard")({ component: () => <Protected path="/dashboard"><Dashboard /></Protected> });

function Counter({ value, prefix = "" }: { value: number; prefix?: string }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => `${prefix}${Math.round(v).toLocaleString()}`);
  useEffect(() => { const c = animate(mv, value, { duration: 1.2, ease: "easeOut" }); return () => c.stop(); }, [value, mv]);
  return <motion.span>{rounded}</motion.span>;
}

interface Stats { todaySales: number; weekRevenue: number; customers: number; products: number; topProduct: string; }

function Dashboard() {
  const [stats, setStats] = useState<Stats>({ todaySales: 0, weekRevenue: 0, customers: 0, products: 0, topProduct: "—" });
  const [revData, setRevData] = useState<{ date: string; revenue: number }[]>([]);
  const [payData, setPayData] = useState<{ name: string; value: number }[]>([]);

  async function load() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 30);
    const [{ data: todayS }, { data: weekS }, { count: cust }, { count: prod }, { data: items }] = await Promise.all([
      supabase.from("sales").select("total").gte("created_at", today.toISOString()),
      supabase.from("sales").select("total, payment_method, created_at").gte("created_at", weekAgo.toISOString()),
      supabase.from("customers").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("sale_items").select("product_name, quantity").limit(500),
    ]);
    const todayTotal = (todayS ?? []).reduce((s, r) => s + Number(r.total), 0);
    const weekTotal = (weekS ?? []).reduce((s, r) => s + Number(r.total), 0);

    const byDay = new Map<string, number>();
    (weekS ?? []).forEach((s) => {
      const d = new Date(s.created_at).toISOString().slice(5, 10);
      byDay.set(d, (byDay.get(d) ?? 0) + Number(s.total));
    });
    setRevData(Array.from(byDay.entries()).map(([date, revenue]) => ({ date, revenue })).slice(-30));

    const byPay = new Map<string, number>();
    (weekS ?? []).forEach((s) => byPay.set(s.payment_method, (byPay.get(s.payment_method) ?? 0) + Number(s.total)));
    setPayData(Array.from(byPay.entries()).map(([name, value]) => ({ name, value })));

    const topMap = new Map<string, number>();
    (items ?? []).forEach((i) => topMap.set(i.product_name, (topMap.get(i.product_name) ?? 0) + i.quantity));
    const top = Array.from(topMap.entries()).sort((a, b) => b[1] - a[1])[0];

    setStats({ todaySales: todayTotal, weekRevenue: weekTotal, customers: cust ?? 0, products: prod ?? 0, topProduct: top?.[0] ?? "—" });
  }

  useEffect(() => {
    load();
    const ch = supabase.channel("dash-sales").on("postgres_changes", { event: "*", schema: "public", table: "sales" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const cards = [
    { label: "Today's Sales", value: stats.todaySales, icon: DollarSign, prefix: "$" },
    { label: "30-Day Revenue", value: stats.weekRevenue, icon: TrendingUp, prefix: "$" },
    { label: "Customers", value: stats.customers, icon: Users },
    { label: "Products", value: stats.products, icon: Package },
  ];
  const COLORS = ["oklch(0.55 0.22 265)", "oklch(0.7 0.18 195)", "oklch(0.75 0.17 70)"];

  return (
    <div className="p-6 md:p-8 space-y-6 relative">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Real-time overview of your shop</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="glass p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{c.label}</span>
                <div className="h-9 w-9 rounded-lg gradient-primary grid place-items-center text-white">
                  <c.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-bold tracking-tight"><Counter value={c.value} prefix={c.prefix} /></div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="glass p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Revenue (30 days)</h3>
            <span className="text-xs text-muted-foreground">Top product: {stats.topProduct}</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={revData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.03 260 / 0.2)" />
                <XAxis dataKey="date" stroke="currentColor" fontSize={12} />
                <YAxis stroke="currentColor" fontSize={12} />
                <Tooltip contentStyle={{ background: "oklch(0.19 0.03 265)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="revenue" stroke="oklch(0.7 0.2 265)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="glass p-5">
          <h3 className="font-semibold mb-4">Payment Methods</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={payData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {payData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.19 0.03 265)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="glass p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Sales Trend</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={revData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.03 260 / 0.2)" />
              <XAxis dataKey="date" stroke="currentColor" fontSize={12} />
              <YAxis stroke="currentColor" fontSize={12} />
              <Tooltip contentStyle={{ background: "oklch(0.19 0.03 265)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 8 }} />
              <Bar dataKey="revenue" fill="oklch(0.7 0.18 195)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
