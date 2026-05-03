import { createFileRoute } from "@tanstack/react-router";
import { Protected } from "@/components/protected";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Building2, Tag } from "lucide-react";
import { UsersAdmin } from "@/components/users-admin";

export const Route = createFileRoute("/settings")({ component: () => <Protected path="/settings"><Settings /></Protected> });

interface Branch { id: string; name: string; address: string | null; phone: string | null; }
interface Coupon { id: string; code: string; type: string; value: number; usage_limit: number | null; usage_count: number; active: boolean; }

function Settings() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [shopName, setShopName] = useState(localStorage.getItem("shop_name") ?? "Supershop");
  const [shopAddr, setShopAddr] = useState(localStorage.getItem("shop_address") ?? "123 Market St");
  const [shopPhone, setShopPhone] = useState(localStorage.getItem("shop_phone") ?? "+1 555 0100");

  // Forms
  const [branchForm, setBranchForm] = useState({ name: "", address: "", phone: "" });
  const [couponForm, setCouponForm] = useState({ code: "", type: "percentage", value: 10, usage_limit: "" });

  async function load() {
    const [{ data: b }, { data: c }] = await Promise.all([
      supabase.from("branches").select("*").order("name"),
      supabase.from("coupons").select("*").order("created_at", { ascending: false }),
    ]);
    setBranches(b ?? []); setCoupons(c ?? []);
  }
  useEffect(() => { load(); }, []);

  function saveShop() {
    localStorage.setItem("shop_name", shopName);
    localStorage.setItem("shop_address", shopAddr);
    localStorage.setItem("shop_phone", shopPhone);
    toast.success("Shop info saved");
  }

  async function addBranch() {
    if (!branchForm.name) return toast.error("Name required");
    const { error } = await supabase.from("branches").insert(branchForm);
    if (error) return toast.error(error.message);
    setBranchForm({ name: "", address: "", phone: "" }); toast.success("Branch added"); load();
  }
  async function delBranch(id: string) {
    const { error } = await supabase.from("branches").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed"); load();
  }
  async function addCoupon() {
    if (!couponForm.code) return toast.error("Code required");
    const { error } = await supabase.from("coupons").insert({
      code: couponForm.code.toUpperCase(), type: couponForm.type, value: couponForm.value,
      usage_limit: couponForm.usage_limit ? Number(couponForm.usage_limit) : null,
    });
    if (error) return toast.error(error.message);
    setCouponForm({ code: "", type: "percentage", value: 10, usage_limit: "" }); toast.success("Coupon created"); load();
  }
  async function delCoupon(id: string) {
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed"); load();
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Shop, branches, and coupons</p>
      </div>

      <Tabs defaultValue="shop">
        <TabsList>
          <TabsTrigger value="shop">Shop</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
        </TabsList>

        <TabsContent value="shop">
          <Card className="glass p-6 space-y-4">
            <div><Label>Shop name</Label><Input value={shopName} onChange={(e) => setShopName(e.target.value)} /></div>
            <div><Label>Address</Label><Input value={shopAddr} onChange={(e) => setShopAddr(e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={shopPhone} onChange={(e) => setShopPhone(e.target.value)} /></div>
            <Button onClick={saveShop} className="gradient-primary text-white border-0">Save</Button>
          </Card>
        </TabsContent>

        <TabsContent value="branches">
          <Card className="glass p-4 space-y-4">
            <div className="grid gap-2 md:grid-cols-4">
              <Input placeholder="Branch name" value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} />
              <Input placeholder="Address" value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} />
              <Input placeholder="Phone" value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} />
              <Button onClick={addBranch}><Plus className="h-4 w-4 mr-2" />Add</Button>
            </div>
            <div className="space-y-2">
              {branches.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                  <Building2 className="h-4 w-4 text-primary" />
                  <div className="flex-1"><div className="font-medium">{b.name}</div><div className="text-xs text-muted-foreground">{b.address} · {b.phone}</div></div>
                  <Button size="icon" variant="ghost" onClick={() => delBranch(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
              {branches.length === 0 && <div className="text-center py-6 text-muted-foreground text-sm">No branches yet</div>}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="coupons">
          <Card className="glass p-4 space-y-4">
            <div className="grid gap-2 md:grid-cols-5">
              <Input placeholder="CODE" value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })} />
              <Select value={couponForm.type} onValueChange={(v) => setCouponForm({ ...couponForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="percentage">% off</SelectItem><SelectItem value="flat">$ off</SelectItem></SelectContent>
              </Select>
              <Input type="number" placeholder="Value" value={couponForm.value} onChange={(e) => setCouponForm({ ...couponForm, value: Number(e.target.value) || 0 })} />
              <Input type="number" placeholder="Usage limit" value={couponForm.usage_limit} onChange={(e) => setCouponForm({ ...couponForm, usage_limit: e.target.value })} />
              <Button onClick={addCoupon}><Plus className="h-4 w-4 mr-2" />Create</Button>
            </div>
            <div className="space-y-2">
              {coupons.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                  <Tag className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <div className="font-mono font-bold">{c.code}</div>
                    <div className="text-xs text-muted-foreground">{c.type === "percentage" ? `${c.value}% off` : `$${c.value} off`} · used {c.usage_count}{c.usage_limit ? `/${c.usage_limit}` : ""}</div>
                  </div>
                  <Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Active" : "Inactive"}</Badge>
                  <Button size="icon" variant="ghost" onClick={() => delCoupon(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
              {coupons.length === 0 && <div className="text-center py-6 text-muted-foreground text-sm">No coupons yet</div>}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
