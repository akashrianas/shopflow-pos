import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/protected";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/reports")({ component: () => <Protected path="/reports"><Page /></Protected> });
function Page() {
  return (
    <div className="p-6 md:p-8 space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
      <Card className="glass p-8 text-center text-muted-foreground">Tax & profit reports with Excel/PDF export. Coming next iteration.</Card>
    </div>
  );
}
