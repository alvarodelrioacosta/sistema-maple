-- 1. Actualizar la restricción de la tabla para incluir 'unauthorized'
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'worker', 'unauthorized'));

-- 2. Modificar el trigger para que los nuevos usuarios sean 'unauthorized' por defecto
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'unauthorized');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. (Opcional) Actualizar usuarios actuales que sean 'worker' pero deberían ser 'unauthorized'
-- Si ya hay trabajadores reales, no ejecutes esto.
-- UPDATE public.profiles SET role = 'unauthorized' WHERE role = 'worker';
