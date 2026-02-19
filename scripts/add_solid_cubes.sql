-- 1. Agregar Solid Cube a resource_images
INSERT INTO public.resource_images (resource_type, image_url, meso_cost, reward_point_cost)
VALUES (
    'solid_cubes', 
    'https://raw.githubusercontent.com/misaomaki/misaomaki.github.io/refs/heads/master/assets/cube/SolidCube.png', 
    0.05, 
    NULL
)
ON CONFLICT (resource_type) 
DO UPDATE SET 
    image_url = EXCLUDED.image_url,
    meso_cost = EXCLUDED.meso_cost,
    reward_point_cost = EXCLUDED.reward_point_cost;

-- 2. Agregar columna solid_cubes_price a la tabla clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS solid_cubes_price numeric DEFAULT 0;

COMMENT ON COLUMN public.clients.solid_cubes_price IS 'Price of Solid Cubes for the client';
