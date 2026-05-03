import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/protected";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Search, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/returns")({ component: () => <Protected path="/returns"><Returns /></Protected> });

interface SaleItem { id: string; product_id: string | null; product_name: string; quantity: number; unit_price: number; }
interface Sale { id: string; invoice_number: string; total: number; created_at: string; }

function Returns() {
  const [q, setQ] = useState("");
  const [sale, setSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [returnQty, setReturnQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function search() {
    if (!q) return;
    const { data } = await supabase.from("sales").select("id, invoice_number, total, created_at").ilike("invoice_number", `%${q}%`).limit(1).maybeSingle();
    if (!data) { toast.error("Invoice not found"); return; }
    setSale(data);
    const { data: si } = await supabase.from("sale_items").select("id, product_id, product_name, quantity, unit_price").eq("sale_id", data.id);
    setItems(si ?? []);
    setReturnQty({});
  }

  async function processReturn() {
    if (!sale) return;
    const lines = items.filter((i) => (returnQty[i.id] ?? 0) > 0);
    if (lines.length === 0) { toast.error("Select at least one item"); return; }
    setBusy(true);
    try {
      const refund = lines.reduce((s, i) => s + i.unit_price * (returnQty[i.id] ?? 0), 0);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ret, error } = await supabase.from("returns").insert({
        sale_id: sale.id, user_id: user?.id, reason, total_refund: refund,
      }).select("id").single();
      if (error || !ret) throw error;
      await supabase.from("return_items").insert(lines.map((i) => ({
        return_id: ret.id, product_id: i.product_id, quantity: returnQty[i.id], unit_price: i.unit_price,
      })));
      // Restock
      for (const i of lines) {
        if (!i.product_id) continue;
        const { data: p } = await supabase.from("products").select("stock_quantity").eq("id", i.product_id).single();
        if (p) await supabase.from("products").update({ stock_quantity: p.stock_quantity + (returnQty[i.id] ?? 0) }).eq("id", i.product_id);
      }
      toast.success(`Refunded $${refund.toFixed(2)}`);
      setSale(null); setItems([]); setReturnQty({}); setReason(""); setQ("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Return failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Returns & Refunds</h1>
        <p className="text-muted-foreground mt-1">Look up invoice and refund items</p>
      </div>

      <Card className="glass p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Invoice # (e.g. INV-20260503-1)" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" onKeyDown={(e) => e.key === "Enter" && search()} />
          </div>
          <Button onClick={search}>Search</Button>
        </div>
      </Card>

      {sale && (
        <Card className="glass p-4 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-mono font-bold">{sale.invoice_number}</div>
              <div className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleString()}</div>
            </div>
            <div className="text-lg font-bold">${Number(sale.total).toFixed(2)}</div>
          </div>
          <div className="space-y-2">
            {items.map((i) => (
              <div key={i.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <div className="flex-1">
                  <div className="font-medium">{i.product_name}</div>
                  <div className="text-xs text-muted-foreground">${Number(i.unit_price).toFixed(2)} × {i.quantity} sold</div>
                </div>
                <Input type="number" min={0} max={i.quantity} placeholder="Qty to return" value={returnQty[i.id] ?? ""} onChange={(e) => setReturnQty({ ...returnQty, [i.id]: Math.min(i.quantity, Math.max(0, Number(e.target.value) || 0)) })} className="w-32" />
              </div>
            ))}
          </div>
          <Textarea placeholder="Reason for return" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button onClick={processReturn} disabled={busy} className="w-full gradient-primary text-white border-0">
            <RotateCcw className="h-4 w-4 mr-2" />{busy ? "Processing..." : "Process Refund"}
          </Button>
        </Card>
      )}
    </div>
  );
}
