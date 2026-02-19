-- Add Perfect Innocence Scroll to resource_images table
INSERT INTO public.resource_images (resource_type, image_url, reward_point_cost, meso_cost)
VALUES (
    'perfect_innoc', 
    'https://raw.githubusercontent.com/alvarodelrioacosta/maplestory-assets/refs/heads/main/perfect_innocence_scroll.png', 
    0, 
    5
)
ON CONFLICT (resource_type) DO UPDATE SET 
    meso_cost = EXCLUDED.meso_cost;

-- Verify
SELECT * FROM public.resource_images WHERE resource_type = 'perfect_innoc';
