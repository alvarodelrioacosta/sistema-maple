-- 1. Crear tabla de perfiles para manejar roles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'worker' CHECK (role IN ('admin', 'worker')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Habilitar RLS (Row Level Security) en profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas para profiles
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 4. Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'worker');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Habilitar Supabase Realtime en tablas clave
-- Importante: Ejecutar esto para añadir las tablas a la publicación de tiempo real
BEGIN;
  -- Eliminar si ya existe el filtro para no duplicar
  DROP PUBLICATION IF EXISTS supabase_realtime;
  
  -- Crear publicación con las tablas que queremos sincronizar
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.event_daily_progress, 
    public.task_progress, 
    public.accounts, 
    public.items;
COMMIT;

-- Nota: El primer usuario que inicie sesión deberá ser promovido a admin manualmente con:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'tu-email@gmail.com';
