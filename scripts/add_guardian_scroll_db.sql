DO $$
BEGIN
    -- 1. Check if 'resource_type' is an ENUM, and add value if so
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_type' OR typname = 'resource_type_enum') THEN
        -- We can't use ALTER TYPE inside DO block easily for adding values if inside transaction sometimes, 
        -- but usually it's fine. 
        -- However, it's safer to just handle the Check Constraint which is more likely for Supabase if not using Custom Types
        -- Let's try to add to enum if it exists.
        -- Note: ALTER TYPE cannot run inside a plpgsql function block in some versions, but let's try.
        -- Actually, better to just print/notice. 
        -- Or assume Check Constraint:
        NULL; -- Place holder
    END IF;

    -- 2. Handle CHECK constraint
    -- Common name format: table_column_check
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resource_inventory_resource_type_check') THEN
        ALTER TABLE resource_inventory DROP CONSTRAINT resource_inventory_resource_type_check;
        ALTER TABLE resource_inventory ADD CONSTRAINT resource_inventory_resource_type_check 
            CHECK (resource_type IN ('bright_cubes', 'bonus_bright_cubes', 'reward_points', 'psok', 'guardian_scroll'));
    END IF;
    
    -- If it's just an ENUM, we need to run:
    -- ALTER TYPE "public"."resource_type" ADD VALUE 'guardian_scroll';
    -- But this will error if it already exists or if type doesn't exist.
    
END $$;

-- If it IS an enum, try to add it (safely catch error if exists?)
-- Postgres doesn't have "ADD VALUE IF NOT EXISTS" natively until v12.
-- We can do:
ALTER TYPE resource_type ADD VALUE IF NOT EXISTS 'guardian_scroll';
-- If the type is named different, this fails. 

-- Let's try to just ADD the check constraint assuming it might be text.
-- If user specifically asked, they might have faced an error.
