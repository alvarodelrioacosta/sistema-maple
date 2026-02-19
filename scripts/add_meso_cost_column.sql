-- Add meso_cost column, defaulting to 0
ALTER TABLE public.resource_images 
ADD COLUMN IF NOT EXISTS meso_cost numeric DEFAULT 0;

-- Update Bright Cubes and Bonus Bright Cubes (0.1B)
UPDATE public.resource_images 
SET meso_cost = 0.1 
WHERE resource_type IN ('bright_cubes', 'bonus_bright_cubes');

-- Update PSOK (1.3B)
UPDATE public.resource_images 
SET meso_cost = 1.3 
WHERE resource_type = 'psok';

-- Update Guardian Scroll (0.8B) - Assuming 'guardian_scroll' is the key based on previous context
UPDATE public.resource_images 
SET meso_cost = 0.8 
WHERE resource_type = 'guardian_scroll';

-- Verify update
SELECT resource_type, meso_cost FROM public.resource_images;
