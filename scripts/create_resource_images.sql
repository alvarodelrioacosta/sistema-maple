-- Create resource_images table
CREATE TABLE IF NOT EXISTS public.resource_images (
    resource_type text PRIMARY KEY,
    image_url text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Optional but recommended)
ALTER TABLE public.resource_images ENABLE ROW LEVEL SECURITY;

-- Create Policy for reading (Public read access?)
CREATE POLICY "Allow public read access" ON public.resource_images
    FOR SELECT USING (true);
    
-- Insert Initial Values
INSERT INTO public.resource_images (resource_type, image_url)
VALUES 
    ('psok', 'https://media.maplestorywiki.net/yetidb/Use_Silver_Scissors_of_Karma.png'),
    ('bright_cubes', 'https://media.maplestorywiki.net/yetidb/Use_Bright_Cube.png'), -- Placeholder / Guess
    ('bonus_bright_cubes', 'https://media.maplestorywiki.net/yetidb/Use_Bonus_Bright_Cube.png'), -- Placeholder
    ('reward_points', 'https://i.imgur.com/reward_points_placeholder.png'), -- Placeholder
    ('guardian_scroll', 'https://media.maplestorywiki.net/yetidb/Use_Guardian_Scroll.png') -- Placeholder
ON CONFLICT (resource_type) 
DO UPDATE SET image_url = EXCLUDED.image_url;
