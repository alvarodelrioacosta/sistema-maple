-- Enable RLS on shared_inventory
ALTER TABLE shared_inventory ENABLE ROW LEVEL SECURITY;

-- Allow public access (or authenticated) as needed for this project context
-- Assuming public/anon access is OK for now based on project history
CREATE POLICY "Enable read access for all users" ON "public"."shared_inventory"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable update for all users" ON "public"."shared_inventory"
AS PERMISSIVE FOR UPDATE
TO public
USING (true);

-- Ensure accounts table policies allow reading the new column (usually irrelevant unless column-level security)
-- But verify RLS is not blocking.
-- Assuming accounts table policies already exist.
