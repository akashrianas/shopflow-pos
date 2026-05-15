import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/protected";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ScanLine, Search } from "lucide-react";
import Fuse from "fuse.js";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { BarcodeScanner } from "@/components/barcode-scanner";

export const Route = createFileRoute("/products")({ component: () => <Protected path="/products"><Products /></Protected> });

interface Product { id: string; name: string; sku: string | null; barcode: string | null; cost_price: number; sell_price: number; stock_quantity: number; low_stock_threshold: number; image_url: string | null; }

function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  async function load() {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setProducts((data ?? []) as Product[]);
  }
  useEffect(() => { load(); }, []);

  const fuse = useMemo(() => new Fuse(products, { keys: ["name", "sku", "barcode"], threshold: 0.4 }), [products]);
  const rows = query ? fuse.search(query).map((r) => r.item) : products;

  async function save() {
    if (!editing?.name) { toast.error("Name required"); return; }
    const payload = {
      name: editing.name, sku: editing.sku || null, barcode: editing.barcode || null,
      cost_price: Number(editing.cost_price) || 0, sell_price: Number(editing.sell_price) || 0,
      stock_quantity: Number(editing.stock_quantity) || 0,
      low_stock_threshold: Number(editing.low_stock_threshold) || 5,
      image_url: editing.image_url?.trim() || null,
    };
    const { error } = editing.id
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setEditing(null); load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-1">{products.length} items in catalog</p>
        </div>
        <Button onClick={() => setEditing({})} className="gradient-primary text-white border-0"><Plus className="h-4 w-4 mr-1" /> Add Product</Button>
      </div>

      <Card className="glass p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Fuzzy search by name, SKU, barcode..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9 max-w-md" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 px-2 w-14"></th>
                <th className="py-2 px-2">Name</th>
                <th className="py-2 px-2">SKU</th>
                <th className="py-2 px-2">Barcode</th>
                <th className="py-2 px-2 text-right">Cost</th>
                <th className="py-2 px-2 text-right">Price</th>
                <th className="py-2 px-2 text-right">Stock</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {rows.map((p) => (
                  <motion.tr key={p.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-2">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} loading="lazy" className="h-10 w-10 rounded-md object-cover bg-muted" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="h-10 w-10 rounded-md gradient-primary grid place-items-center text-white text-[10px] font-bold opacity-70">
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-2 font-medium">{p.name}</td>
                    <td className="py-2.5 px-2 font-mono text-xs">{p.sku ?? "—"}</td>
                    <td className="py-2.5 px-2 font-mono text-xs">{p.barcode ?? "—"}</td>
                    <td className="py-2.5 px-2 text-right">${Number(p.cost_price).toFixed(2)}</td>
                    <td className="py-2.5 px-2 text-right font-bold">${Number(p.sell_price).toFixed(2)}</td>
                    <td className={`py-2.5 px-2 text-right ${p.stock_quantity <= p.low_stock_threshold ? "text-destructive font-bold" : ""}`}>{p.stock_quantity}</td>
                    <td className="py-2.5 px-2 text-right">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {rows.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No products yet</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Add"} Product</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={editing?.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SKU</Label><Input value={editing?.sku ?? ""} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} /></div>
              <div>
                <Label>Barcode</Label>
                <div className="flex gap-1">
                  <Input value={editing?.barcode ?? ""} onChange={(e) => setEditing({ ...editing, barcode: e.target.value })} />
                  <Dialog open={scanOpen} onOpenChange={setScanOpen}>
                    <DialogTrigger asChild><Button type="button" size="icon" variant="outline"><ScanLine className="h-4 w-4" /></Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Scan</DialogTitle></DialogHeader>
                      {scanOpen && <BarcodeScanner onResult={(c) => { setEditing({ ...editing, barcode: c }); setScanOpen(false); }} />}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cost Price</Label><Input type="number" step="0.01" value={editing?.cost_price ?? ""} onChange={(e) => setEditing({ ...editing, cost_price: Number(e.target.value) })} /></div>
              <div><Label>Sell Price</Label><Input type="number" step="0.01" value={editing?.sell_price ?? ""} onChange={(e) => setEditing({ ...editing, sell_price: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Stock Qty</Label><Input type="number" value={editing?.stock_quantity ?? ""} onChange={(e) => setEditing({ ...editing, stock_quantity: Number(e.target.value) })} /></div>
              <div><Label>Low Stock Alert</Label><Input type="number" value={editing?.low_stock_threshold ?? 5} onChange={(e) => setEditing({ ...editing, low_stock_threshold: Number(e.target.value) })} /></div>
            </div>
            <div>
              <Label>Image URL</Label>
              <Input placeholder="https://..." value={editing?.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} />
              {editing?.image_url ? (
                <img src={editing.image_url} alt="preview" className="mt-2 h-20 w-20 rounded-md object-cover bg-muted" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
