import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/protected";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/settings")({ component: () => <Protected path="/settings"><Page /></Protected> });
function Page() {
  return (
    <div className="p-6 md:p-8 space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <Card className="glass p-8 text-center text-muted-foreground">Shop config, branches, and coupons. Coming next iteration.</Card>
    </div>
  );
}
