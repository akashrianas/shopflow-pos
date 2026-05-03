import jsPDF from "jspdf";

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  salesman: string;
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  customer: { name?: string; phone?: string; email?: string; address?: string };
  items: { name: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  isCreditNote?: boolean;
}

export function generateInvoicePdf(d: InvoiceData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  let y = 40;

  doc.setFillColor(85, 80, 220);
  doc.rect(0, 0, w, 80, "F");
  doc.setTextColor(255);
  doc.setFontSize(22).setFont("helvetica", "bold");
  doc.text(d.shopName, 40, 45);
  doc.setFontSize(10).setFont("helvetica", "normal");
  doc.text(d.shopAddress, 40, 62);
  doc.text(d.shopPhone, 40, 75);

  doc.setFontSize(20).setFont("helvetica", "bold");
  doc.text(d.isCreditNote ? "CREDIT NOTE" : "INVOICE", w - 40, 45, { align: "right" });
  doc.setFontSize(10).setFont("helvetica", "normal");
  doc.text(`#${d.invoiceNumber}`, w - 40, 62, { align: "right" });
  doc.text(d.date, w - 40, 75, { align: "right" });

  y = 110;
  doc.setTextColor(40);
  doc.setFontSize(11).setFont("helvetica", "bold");
  doc.text("Bill To", 40, y);
  doc.text("Cashier", w / 2, y);
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(d.customer.name || "Walk-in Customer", 40, y + 16);
  if (d.customer.phone) doc.text(d.customer.phone, 40, y + 30);
  if (d.customer.email) doc.text(d.customer.email, 40, y + 44);
  doc.text(d.salesman, w / 2, y + 16);
  doc.text(`Payment: ${d.paymentMethod}`, w / 2, y + 30);

  y += 80;
  doc.setFillColor(240, 240, 240);
  doc.rect(40, y, w - 80, 24, "F");
  doc.setFont("helvetica", "bold").setFontSize(10);
  doc.text("Item", 50, y + 16);
  doc.text("Qty", w - 240, y + 16, { align: "right" });
  doc.text("Price", w - 160, y + 16, { align: "right" });
  doc.text("Total", w - 50, y + 16, { align: "right" });
  y += 30;

  doc.setFont("helvetica", "normal");
  d.items.forEach((it) => {
    doc.text(it.name.slice(0, 50), 50, y);
    doc.text(it.quantity.toString(), w - 240, y, { align: "right" });
    doc.text(it.unitPrice.toFixed(2), w - 160, y, { align: "right" });
    doc.text(it.lineTotal.toFixed(2), w - 50, y, { align: "right" });
    y += 18;
  });

  y += 10;
  doc.setDrawColor(200);
  doc.line(w - 240, y, w - 40, y);
  y += 16;
  const row = (label: string, val: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, w - 200, y);
    doc.text(val, w - 50, y, { align: "right" });
    y += 16;
  };
  row("Subtotal", d.subtotal.toFixed(2));
  row("Discount", `-${d.discount.toFixed(2)}`);
  row("Tax", d.tax.toFixed(2));
  doc.setFontSize(13);
  row("TOTAL", d.total.toFixed(2), true);

  doc.setFontSize(9).setTextColor(120);
  doc.text("Thank you for your business!", w / 2, doc.internal.pageSize.getHeight() - 30, { align: "center" });

  return doc;
}
