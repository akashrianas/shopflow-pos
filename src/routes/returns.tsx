import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/protected";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/returns")({ component: () => <Protected path="/returns"><Page /></Protected> });
function Page() {
  return (
    <div className="p-6 md:p-8 space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Returns & Refunds</h1>
      <Card className="glass p-8 text-center text-muted-foreground">Search invoices to process returns. Module coming in next iteration.</Card>
    </div>
  );
}
