import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/protected";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart, calcTotals } from "@/lib/cart-store";
import Fuse from "fuse.js";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Trash2, Plus, Minus, ScanLine, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { sendInvoiceWhatsApp } from "@/lib/whatsapp";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarcodeScanner } from "@/components/barcode-scanner";

export const Route = createFileRoute("/pos")({ component: () => <Protected path="/pos"><POS /></Protected> });

interface Product { id: string; name: string; sell_price: number; stock_quantity: number; barcode: string | null; sku: string | null; image_url: string | null; }

function POS() {
  const cart = useCart();
  const totals = calcTotals(cart);
  const { fullName } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<{ id: string; number: string; phone?: string } | null>(null);

  async function load() {
    const { data } = await supabase.from("products").select("id, name, sell_price, stock_quantity, barcode, sku, image_url").order("name");
    setProducts(data ?? []);
  }
  useEffect(() => { load(); }, []);

  const fuse = useMemo(() => new Fuse(products, { keys: ["name", "sku", "barcode"], threshold: 0.4 }), [products]);
  const results = query ? fuse.search(query).slice(0, 30).map((r) => r.item) : products.slice(0, 30);

  function addProduct(p: Product) {
    if (p.stock_quantity <= 0) { toast.error("Out of stock"); return; }
    cart.add({ id: p.id, name: p.name, price: Number(p.sell_price), stock: p.stock_quantity });
  }

  function onBarcode(code: string) {
    setScanOpen(false);
    const found = products.find((p) => p.barcode === code || p.sku === code);
    if (found) { addProduct(found); toast.success(`Added ${found.name}`); }
    else toast.error(`No product with code ${code}`);
  }

  async function checkout() {
    if (cart.items.length === 0) { toast.error("Cart is empty"); return; }
    setBusy(true);
    try {
      let customerId: string | null = null;
      if (cart.customer.name) {
        const { data: c } = await supabase.from("customers").insert({
          name: cart.customer.name, phone: cart.customer.phone || null,
          email: cart.customer.email || null, address: cart.customer.address || null,
          total_spent: totals.total, visit_count: 1,
        }).select("id").single();
        customerId = c?.id ?? null;
      }
      const { data: invNum } = await supabase.rpc("gen_invoice_number");
      const { data: { user } } = await supabase.auth.getUser();
      const { data: sale, error: saleErr } = await supabase.from("sales").insert({
        invoice_number: invNum as string,
        user_id: user?.id, customer_id: customerId,
        subtotal: totals.subtotal, discount: totals.discountAmt, tax: totals.tax, total: totals.total,
        payment_method: cart.paymentMethod,
      }).select("id, invoice_number").single();
      if (saleErr || !sale) throw saleErr;

      await supabase.from("sale_items").insert(cart.items.map((i) => ({
        sale_id: sale.id, product_id: i.id, product_name: i.name,
        quantity: i.quantity, unit_price: i.price, line_total: i.price * i.quantity,
      })));
      // Decrement stock
      for (const i of cart.items) {
        await supabase.from("products").update({ stock_quantity: i.stock - i.quantity }).eq("id", i.id);
      }

      // Generate PDF
      const pdf = generateInvoicePdf({
        invoiceNumber: sale.invoice_number, date: new Date().toLocaleString(),
        salesman: fullName ?? "Staff",
        shopName: "Supershop", shopAddress: "123 Market St", shopPhone: "+1 555 0100",
        customer: cart.customer,
        items: cart.items.map((i) => ({ name: i.name, quantity: i.quantity, unitPrice: i.price, lineTotal: i.price * i.quantity })),
        subtotal: totals.subtotal, discount: totals.discountAmt, tax: totals.tax, total: totals.total,
        paymentMethod: cart.paymentMethod,
      });
      pdf.save(`${sale.invoice_number}.pdf`);

      setLastInvoice({ id: sale.id, number: sale.invoice_number, phone: cart.customer.phone });
      toast.success(`Sale complete — ${sale.invoice_number}`);
      cart.clear();
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="p-4 md:p-6 grid gap-4 lg:grid-cols-[1fr_420px] h-screen overflow-hidden">
      <div className="flex flex-col gap-4 min-h-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products (fuzzy: 'koke' finds 'Coke')" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={() => setScanOpen(true)} variant="outline"><ScanLine className="h-4 w-4 mr-2" />Scan</Button>
        </div>
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pr-1">
          <AnimatePresence mode="popLayout">
            {results.map((p) => (
              <motion.button
                key={p.id} layout
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
                onClick={() => addProduct(p)}
                className="glass rounded-xl p-3 text-left hover:border-primary/50 transition-colors"
              >
                <div className="aspect-square rounded-lg gradient-primary mb-2 grid place-items-center text-white text-xl font-bold opacity-70">
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="font-medium text-sm truncate">{p.name}</div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="font-bold">${Number(p.sell_price).toFixed(2)}</span>
                  <span className={p.stock_quantity <= 5 ? "text-destructive" : "text-muted-foreground"}>×{p.stock_quantity}</span>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
          {results.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-16">
              No products. <a href="/products" className="text-primary underline">Add some →</a>
            </div>
          )}
        </div>
      </div>

      <Card className="glass flex flex-col min-h-0 overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-bold text-lg flex items-center gap-2"><Receipt className="h-5 w-5" /> Cart ({cart.items.length})</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <AnimatePresence>
            {cart.items.map((i) => (
              <motion.div key={i.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{i.name}</div>
                  <div className="text-xs text-muted-foreground">${i.price.toFixed(2)} × {i.quantity}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => cart.setQty(i.id, i.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                  <span className="w-6 text-center text-sm">{i.quantity}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => cart.setQty(i.id, i.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => cart.remove(i.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {cart.items.length === 0 && <div className="text-center text-muted-foreground text-sm py-8">Empty cart</div>}
        </div>
        <div className="border-t border-border p-4 space-y-3">
          <Input placeholder="Customer name (optional)" value={cart.customer.name} onChange={(e) => cart.setCustomer({ name: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Phone" value={cart.customer.phone} onChange={(e) => cart.setCustomer({ phone: e.target.value })} />
            <Input placeholder="Email" value={cart.customer.email} onChange={(e) => cart.setCustomer({ email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Tax %</Label>
              <Input type="number" value={cart.taxRate} onChange={(e) => cart.setTaxRate(Number(e.target.value) || 0)} />
            </div>
            <div>
              <Label className="text-xs">Discount</Label>
              <div className="flex gap-1">
                <Input type="number" value={cart.discount} onChange={(e) => cart.setDiscount(Number(e.target.value) || 0, cart.discountType)} />
                <Select value={cart.discountType} onValueChange={(v) => cart.setDiscount(cart.discount, v as "flat" | "percentage")}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">$</SelectItem>
                    <SelectItem value="percentage">%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Select value={cart.paymentMethod} onValueChange={(v) => cart.setPayment(v as "cash" | "card" | "mobile")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
            </SelectContent>
          </Select>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>${totals.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>-${totals.discountAmt.toFixed(2)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>${totals.tax.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-lg pt-1 border-t border-border"><span>Total</span><span className="gradient-text">${totals.total.toFixed(2)}</span></div>
          </div>
          <Button onClick={checkout} disabled={busy || cart.items.length === 0} className="w-full gradient-primary text-white border-0 h-11">
            {busy ? "Processing..." : "Generate Invoice & Complete Sale"}
          </Button>
        </div>
      </Card>

      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Scan Barcode</DialogTitle></DialogHeader>
          {scanOpen && <BarcodeScanner onResult={onBarcode} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!lastInvoice} onOpenChange={(o) => !o && setLastInvoice(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sale Complete!</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-muted-foreground">Invoice <span className="font-mono font-bold text-foreground">{lastInvoice?.number}</span> generated and downloaded.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => window.print()}>Print</Button>
              <Button variant="outline" disabled={!lastInvoice?.phone} onClick={async () => {
                if (!lastInvoice?.phone) return;
                await sendInvoiceWhatsApp(lastInvoice.phone, lastInvoice.number);
                toast.success("WhatsApp sent (mock)");
              }}>Send WhatsApp</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
