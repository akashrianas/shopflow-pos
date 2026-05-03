import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Trash2, Shield } from "lucide-react";
import { adminListUsers, adminCreateUser, adminSetUserRole, adminDeleteUser } from "@/server/users.functions";

type Role = "admin" | "manager" | "salesman";
interface U { id: string; email?: string; full_name: string | null; role: Role; created_at: string; }

export function UsersAdmin() {
  const [users, setUsers] = useState<U[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "salesman" as Role });

  async function load() {
    setLoading(true);
    try { setUsers((await adminListUsers()) as U[]); }
    catch (e: any) { toast.error(e?.message ?? "Failed to load users"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.email || !form.password || form.password.length < 6) return toast.error("Email and password (6+ chars) required");
    try {
      await adminCreateUser({ data: form });
      toast.success("User created");
      setForm({ email: "", password: "", full_name: "", role: "salesman" });
      load();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }
  async function setRole(id: string, role: Role) {
    try { await adminSetUserRole({ data: { user_id: id, role } }); toast.success("Role updated"); load(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }
  async function del(id: string) {
    if (!confirm("Delete this user?")) return;
    try { await adminDeleteUser({ data: { user_id: id } }); toast.success("Deleted"); load(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <div className="space-y-4">
      <Card className="glass p-4 space-y-3">
        <h3 className="font-bold flex items-center gap-2"><UserPlus className="h-4 w-4" /> Add user</h3>
        <div className="grid gap-2 md:grid-cols-5">
          <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="salesman">Salesman</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={create} className="gradient-primary text-white border-0">Create</Button>
        </div>
      </Card>

      <Card className="glass p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2"><Shield className="h-4 w-4" /> Team members</h3>
          <Label className="text-xs text-muted-foreground">{loading ? "Loading…" : `${users.length} users`}</Label>
        </div>
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/40">
              <div className="flex-1 min-w-[200px]">
                <div className="font-medium">{u.full_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </div>
              <Select value={u.role} onValueChange={(v) => setRole(u.id, v as Role)}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="salesman">Salesman</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className="capitalize">{u.role}</Badge>
              <Button size="icon" variant="ghost" onClick={() => del(u.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {!loading && users.length === 0 && <div className="text-center py-6 text-muted-foreground text-sm">No users</div>}
        </div>
      </Card>
    </div>
  );
}
