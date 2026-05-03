import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/protected";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Eye, Download, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { sendInvoiceWhatsApp } from "@/lib/whatsapp";
import { toast } from "sonner";
import { CartLoader } from "@/components/cart-loader";

export const Route = createFileRoute("/invoices")({ component: () => <Protected path="/invoices"><Invoices /></Protected> });

interface SaleRow { id: string; invoice_number: string; total: number; subtotal: number; discount: number; tax: number; payment_method: string; created_at: string; customer_id: string | null; }
interface SaleItem { id: string; product_name: string; quantity: number; unit_price: number; line_total: number; }
interface Customer { name: string; phone: string | null; email: string | null; address: string | null; }

function Invoices() {
  const [list, setList] = useState<SaleRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SaleRow | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase.from("sales")
      .select("id, invoice_number, total, subtotal, discount, tax, payment_method, created_at, customer_id")
      .order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => { setList(data ?? []); setLoading(false); });
  }, []);

  async function openDetail(s: SaleRow) {
    setSelected(s);
    setDetailLoading(true);
    setItems([]); setCustomer(null);
    const [{ data: it }, cu] = await Promise.all([
      supabase.from("sale_items").select("id, product_name, quantity, unit_price, line_total").eq("sale_id", s.id),
      s.customer_id ? supabase.from("customers").select("name, phone, email, address").eq("id", s.customer_id).single() : Promise.resolve({ data: null } as { data: Customer | null }),
    ]);
    setItems(it ?? []);
    setCustomer((cu as { data: Customer | null }).data);
    setDetailLoading(false);
  }

  function downloadPdf() {
    if (!selected) return;
    const pdf = generateInvoicePdf({
      invoiceNumber: selected.invoice_number,
      date: new Date(selected.created_at).toLocaleString(),
      salesman: "Staff",
      shopName: "Supershop", shopAddress: "123 Market St", shopPhone: "+1 555 0100",
      customer: customer ?? {},
      items: items.map((i) => ({ name: i.product_name, quantity: i.quantity, unitPrice: Number(i.unit_price), lineTotal: Number(i.line_total) })),
      subtotal: Number(selected.subtotal), discount: Number(selected.discount), tax: Number(selected.tax), total: Number(selected.total),
      paymentMethod: selected.payment_method,
    });
    pdf.save(`${selected.invoice_number}.pdf`);
  }

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
        {loading ? <CartLoader label="Loading invoices..." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 px-2">Invoice</th><th className="py-2 px-2">Date</th>
                <th className="py-2 px-2">Payment</th><th className="py-2 px-2 text-right">Total</th>
                <th className="py-2 px-2 text-right">Action</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => openDetail(r)}>
                    <td className="py-2.5 px-2 font-mono">{r.invoice_number}</td>
                    <td className="py-2.5 px-2">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-2.5 px-2 capitalize">{r.payment_method}</td>
                    <td className="py-2.5 px-2 text-right font-bold">${Number(r.total).toFixed(2)}</td>
                    <td className="py-2.5 px-2 text-right">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openDetail(r); }}>
                        <Eye className="h-4 w-4 mr-1" />View
                      </Button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No invoices</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">{selected?.invoice_number}</DialogTitle>
          </DialogHeader>
          {detailLoading ? <CartLoader label="Loading details..." /> : selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs uppercase mb-1">Date</div>
                  <div>{new Date(selected.created_at).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs uppercase mb-1">Payment</div>
                  <div className="capitalize">{selected.payment_method}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground text-xs uppercase mb-1">Customer</div>
                  <div>{customer?.name ?? "Walk-in customer"}</div>
                  {customer?.phone && <div className="text-xs text-muted-foreground">{customer.phone}</div>}
                  {customer?.email && <div className="text-xs text-muted-foreground">{customer.email}</div>}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground text-xs uppercase mb-2">Items ({items.length})</div>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr className="text-left">
                        <th className="py-2 px-3">Product</th>
                        <th className="py-2 px-3 text-right">Qty</th>
                        <th className="py-2 px-3 text-right">Price</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((i) => (
                        <tr key={i.id} className="border-t border-border">
                          <td className="py-2 px-3">{i.product_name}</td>
                          <td className="py-2 px-3 text-right">{i.quantity}</td>
                          <td className="py-2 px-3 text-right">${Number(i.unit_price).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-medium">${Number(i.line_total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-1 text-sm border-t border-border pt-3">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${Number(selected.subtotal).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-${Number(selected.discount).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${Number(selected.tax).toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-border"><span>Total</span><span className="gradient-text">${Number(selected.total).toFixed(2)}</span></div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" onClick={downloadPdf}><Download className="h-4 w-4 mr-2" />Download PDF</Button>
                <Button variant="outline" disabled={!customer?.phone} onClick={async () => {
                  if (!customer?.phone || !selected) return;
                  await sendInvoiceWhatsApp(customer.phone, selected.invoice_number);
                  toast.success("WhatsApp sent (mock)");
                }}><MessageCircle className="h-4 w-4 mr-2" />Send WhatsApp</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
