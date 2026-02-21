-- ========================================================
-- PERMISOS DE ACCESO A CATÁLOGOS PARA WORKERS
-- ========================================================

-- Habilitar lectura SELECT para Workers en tablas de catálogo
DO $$ 
DECLARE 
  t text;
BEGIN
  -- Tablas que un Worker necesita leer para que la App funcione correctamente
  FOR t IN (VALUES 
    ('items_db'), 
    ('classes'), 
    ('exchange_rates'), 
    ('potentials'), 
    ('financial_accounts'), 
    ('shared_inventory'),
    ('clients')
  ) 
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Worker can view catalog %I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Worker can view catalog %I" ON public.%I FOR SELECT TO authenticated USING (public.get_my_role() = ''worker'')', t, t);
  END LOOP;
END $$;

-- Asegurar que Workers también puedan leer las tablas que ya tenían, por si acaso
-- (Accounts, Events, Tasks, Items, Characters ya estaban en la migración anterior)
