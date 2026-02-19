-- ========================================================
-- SCRIPT DE BLINDAJE DE SEGURIDAD (RLS) - CORREGIDO
-- ========================================================

-- Función auxiliar para checkear roles
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. Habilitar RLS en todas las tablas
DO $$ 
DECLARE 
  t text;
BEGIN
  FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') 
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- 2. Limpiar políticas existentes
DO $$ 
DECLARE 
  pol record;
BEGIN
  FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 3. POLÍTICA UNIVERSAL PARA ADMINISTRADORES
DO $$ 
DECLARE 
  t text;
BEGIN
  FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') 
  LOOP
    EXECUTE format('CREATE POLICY "Admin full access" ON public.%I TO authenticated USING (public.get_my_role() = ''admin'') WITH CHECK (public.get_my_role() = ''admin'')', t);
  END LOOP;
END $$;

-- 4. POLÍTICAS PARA TRABAJADORES (Worker)
-- Corregido: 'events' en lugar de 'game_events'
DO $$ 
DECLARE 
  t text;
BEGIN
  FOR t IN (VALUES ('accounts'), ('events'), ('tasks'), ('items'), ('characters'), ('event_daily_rewards'), ('event_daily_progress'), ('task_progress'), ('profiles'), ('event_bosses'), ('event_shop_items')) 
  LOOP
    EXECUTE format('CREATE POLICY "Worker can view table" ON public.%I FOR SELECT TO authenticated USING (public.get_my_role() = ''worker'')', t);
  END LOOP;
END $$;

-- Permisos de escritura para Workers
CREATE POLICY "Worker can toggle event progress" 
  ON public.event_daily_progress FOR ALL TO authenticated 
  USING (public.get_my_role() = 'worker') 
  WITH CHECK (public.get_my_role() = 'worker');

CREATE POLICY "Worker can toggle task progress" 
  ON public.task_progress FOR ALL TO authenticated 
  USING (public.get_my_role() = 'worker') 
  WITH CHECK (public.get_my_role() = 'worker');

CREATE POLICY "Worker can update accounts" 
  ON public.accounts FOR UPDATE TO authenticated 
  USING (public.get_my_role() = 'worker') 
  WITH CHECK (public.get_my_role() = 'worker');

CREATE POLICY "Worker can update items" 
  ON public.items FOR UPDATE TO authenticated 
  USING (public.get_my_role() = 'worker') 
  WITH CHECK (public.get_my_role() = 'worker');
