
-- Remove "Junk" lines from main_potential table as requested by user

-- 1. "Chance to obtain the stat" (Header residue)
DELETE FROM main_potential 
WHERE potential_name = 'Chance to obtain the stat';

-- 2. "Reflect damage at a chance" (Ambiguous/Junk)
DELETE FROM main_potential 
WHERE potential_name = 'Reflect damage at a chance';

-- 3. "MP cost reduction as listed." (Footer residue)
DELETE FROM main_potential 
WHERE potential_name = 'MP cost reduction as listed.';

-- 4. Long disclaimer about MP Potion Recovery
-- Using LIKE to handle potential special character (nbsp) before '%' safely
DELETE FROM main_potential 
WHERE potential_name LIKE 'Does not apply to MP potion recovery%';

-- Optional: Check Bonus Potentials too? User said "Main Potential" specifically.
-- But usually these disclaimers appear in Bonus too.
-- Uncomment below if you want to clean Bonus table as well.
/*
DELETE FROM bonus_potential WHERE potential_name = 'Chance to obtain the stat';
DELETE FROM bonus_potential WHERE potential_name = 'Reflect damage at a chance';
DELETE FROM bonus_potential WHERE potential_name = 'MP cost reduction as listed.';
DELETE FROM bonus_potential WHERE potential_name LIKE 'Does not apply to MP potion recovery%';
*/
