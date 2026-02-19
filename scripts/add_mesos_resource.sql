-- Add mesos to resource_images table
INSERT INTO public.resource_images (resource_type, image_url, meso_cost)
VALUES ('mesos', 'https://raw.githubusercontent.com/alvarodelrioacosta/maplestory-assets/refs/heads/main/meso_bag.png', 0)
ON CONFLICT (resource_type) DO UPDATE SET image_url = EXCLUDED.image_url;

-- Verify
SELECT * FROM public.resource_images WHERE resource_type = 'mesos';
