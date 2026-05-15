
-- 1. Customers: restrict PII reads to admin/manager
DROP POLICY IF EXISTS "auth read" ON public.customers;
CREATE POLICY "staff read customers" ON public.customers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

-- 2. Remove user_roles + profiles from realtime publication
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='user_roles') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.user_roles;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='profiles') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;
  END IF;
END $$;

-- 3. Tighten INSERT policies on admin/manager-only tables
DO $$ DECLARE t TEXT; BEGIN
  FOR t IN SELECT unnest(ARRAY['branches','categories','suppliers','products','coupons','purchase_orders','purchase_order_items']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth insert" ON public.%I;', t);
    EXECUTE format('CREATE POLICY "mgr insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''manager''));', t);
  END LOOP;
END $$;

-- 4. Replace permissive WITH CHECK true on staff-writable tables with explicit role allow-list
DO $$ DECLARE t TEXT; BEGIN
  FOR t IN SELECT unnest(ARRAY['customers','sales','sale_items','shifts','stock_adjustments','returns','return_items']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth insert" ON public.%I;', t);
    EXECUTE format('CREATE POLICY "staff insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''manager'') OR public.has_role(auth.uid(),''salesman''));', t);
  END LOOP;
END $$;

-- 5. Explicitly block non-admin INSERT into user_roles (privilege escalation defense in depth)
DROP POLICY IF EXISTS "block non-admin role insert" ON public.user_roles;
CREATE POLICY "block non-admin role insert" ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 6. Function hardening: search_path + revoke EXECUTE from anon
ALTER FUNCTION public.gen_invoice_number() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.gen_invoice_number() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- 7. Hide product cost_price from non-privileged authenticated users (column-level)
REVOKE SELECT (cost_price) ON public.products FROM anon;
REVOKE SELECT (cost_price) ON public.products FROM authenticated;
-- Allow admin/manager to read full product rows including cost via SECURITY DEFINER RPC
CREATE OR REPLACE FUNCTION public.admin_list_products()
RETURNS SETOF public.products LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.products
  WHERE public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')
  ORDER BY created_at DESC
$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_products() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_list_products() TO authenticated;
