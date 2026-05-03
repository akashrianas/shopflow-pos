import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/protected";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/staff")({ component: () => <Protected path="/staff"><Page /></Protected> });
function Page() {
  return (
    <div className="p-6 md:p-8 space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Staff & Shifts</h1>
      <Card className="glass p-8 text-center text-muted-foreground">Manage staff accounts, roles, and shift open/close. Coming next iteration.</Card>
    </div>
  );
}
