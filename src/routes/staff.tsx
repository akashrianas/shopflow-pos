import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/protected";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, DollarSign } from "lucide-react";

export const Route = createFileRoute("/staff")({ component: () => <Protected path="/staff"><Staff /></Protected> });

interface StaffRow { id: string; full_name: string | null; role?: string; }
interface Shift { id: string; user_id: string; opened_at: string; closed_at: string | null; opening_cash: number; closing_cash: number | null; }

function Staff() {
  const { user, role } = useAuth();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [openShift, setOpenShift] = useState<Shift | null>(null);
  const [openingCash, setOpeningCash] = useState(0);
  const [closingCash, setClosingCash] = useState(0);

  async function load() {
    const { data: profs } = await supabase.from("profiles").select("id, full_name");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const merged = (profs ?? []).map((p) => ({ ...p, role: roles?.find((r) => r.user_id === p.id)?.role ?? "salesman" }));
    setStaff(merged);
    const { data: sh } = await supabase.from("shifts").select("*").order("opened_at", { ascending: false }).limit(50);
    setShifts(sh ?? []);
    if (user) {
      const mine = sh?.find((s) => s.user_id === user.id && !s.closed_at);
      setOpenShift(mine ?? null);
    }
  }
  useEffect(() => { load(); }, [user]);

  async function startShift() {
    if (!user) return;
    const { data, error } = await supabase.from("shifts").insert({ user_id: user.id, opening_cash: openingCash }).select("*").single();
    if (error) { toast.error(error.message); return; }
    setOpenShift(data); setOpeningCash(0); toast.success("Shift started");
    load();
  }
  async function endShift() {
    if (!openShift) return;
    const { error } = await supabase.from("shifts").update({ closed_at: new Date().toISOString(), closing_cash: closingCash }).eq("id", openShift.id);
    if (error) { toast.error(error.message); return; }
    setOpenShift(null); setClosingCash(0); toast.success("Shift closed");
    load();
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Staff & Shifts</h1>
        <p className="text-muted-foreground mt-1">Manage cashier shifts</p>
      </div>

      <Card className="glass p-6">
        <h2 className="font-bold mb-4 flex items-center gap-2"><Clock className="h-4 w-4" /> My Shift</h2>
        {openShift ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Opened {new Date(openShift.opened_at).toLocaleString()} · Opening cash <b>${Number(openShift.opening_cash).toFixed(2)}</b></div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Closing cash</Label>
                <Input type="number" value={closingCash} onChange={(e) => setClosingCash(Number(e.target.value) || 0)} />
              </div>
              <Button onClick={endShift} variant="destructive">End Shift</Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>Opening cash</Label>
              <Input type="number" value={openingCash} onChange={(e) => setOpeningCash(Number(e.target.value) || 0)} />
            </div>
            <Button onClick={startShift} className="gradient-primary text-white border-0"><DollarSign className="h-4 w-4 mr-2" />Start Shift</Button>
          </div>
        )}
      </Card>

      {(role === "admin" || role === "manager") && (
        <>
          <Card className="glass p-4">
            <h2 className="font-bold mb-3">Team</h2>
            <div className="grid gap-2 md:grid-cols-2">
              {staff.map((s) => (
                <div key={s.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/40">
                  <div className="font-medium">{s.full_name ?? "—"}</div>
                  <Badge variant="outline" className="capitalize">{s.role}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="glass p-4">
            <h2 className="font-bold mb-3">Recent Shifts</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 px-2">Cashier</th><th className="py-2 px-2">Opened</th>
                  <th className="py-2 px-2">Closed</th><th className="py-2 px-2 text-right">Open / Close</th>
                </tr></thead>
                <tbody>
                  {shifts.map((s) => (
                    <tr key={s.id} className="border-b border-border/50">
                      <td className="py-2 px-2">{staff.find((p) => p.id === s.user_id)?.full_name ?? "—"}</td>
                      <td className="py-2 px-2">{new Date(s.opened_at).toLocaleString()}</td>
                      <td className="py-2 px-2">{s.closed_at ? new Date(s.closed_at).toLocaleString() : <Badge>Open</Badge>}</td>
                      <td className="py-2 px-2 text-right font-mono">${Number(s.opening_cash).toFixed(2)} / {s.closing_cash != null ? `$${Number(s.closing_cash).toFixed(2)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
