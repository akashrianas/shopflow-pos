// MOCK WhatsApp service. Swap for a real Twilio/edge-function call later.
export async function sendInvoiceWhatsApp(phone: string, invoiceId: string) {
  // eslint-disable-next-line no-console
  console.log(`[MOCK] Sending WhatsApp to +${phone}: invoice #${invoiceId}`);
  await new Promise((r) => setTimeout(r, 600));
  return { status: "sent" as const };
}
