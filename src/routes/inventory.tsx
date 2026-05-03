import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/protected";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/inventory")({ component: () => <Protected path="/inventory"><Inventory /></Protected> });

function Inventory() {
  const [products, setProducts] = useState<{ id: string; name: string; stock_quantity: number; low_stock_threshold: number; sell_price: number }[]>([]);
  useEffect(() => {
    supabase.from("products").select("id, name, stock_quantity, low_stock_threshold, sell_price").order("stock_quantity").then(({ data }) => setProducts(data ?? []));
  }, []);
  const lowCount = products.filter((p) => p.stock_quantity <= p.low_stock_threshold).length;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground mt-1">{lowCount} items low on stock</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => {
          const low = p.stock_quantity <= p.low_stock_threshold;
          const pct = Math.min(100, (p.stock_quantity / Math.max(p.low_stock_threshold * 4, 20)) * 100);
          return (
            <motion.div key={p.id} animate={low ? { boxShadow: ["0 0 0 0 oklch(0.6 0.24 25 / 0.5)", "0 0 0 8px oklch(0.6 0.24 25 / 0)"] } : {}} transition={{ duration: 1.5, repeat: low ? Infinity : 0 }} className="rounded-xl">
              <Card className="glass p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium truncate">{p.name}</div>
                  {low && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                </div>
                <div className="text-2xl font-bold">{p.stock_quantity}</div>
                <Progress value={pct} className="mt-2" />
                <div className="text-xs text-muted-foreground mt-2">${Number(p.sell_price).toFixed(2)} • alert below {p.low_stock_threshold}</div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
