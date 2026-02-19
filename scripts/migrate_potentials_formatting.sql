
-- 1. Standardize Potential Names
UPDATE main_potential
SET potential_name = REPLACE(potential_name, ' Increase', '')
WHERE potential_name LIKE '% Increase%';

UPDATE bonus_potential
SET potential_name = REPLACE(potential_name, ' Increase', '')
WHERE potential_name LIKE '% Increase%';

UPDATE main_potential
SET potential_name = REPLACE(potential_name, 'Weapon ATT', 'Attack Power')
WHERE potential_name LIKE '%Weapon ATT%';

UPDATE bonus_potential
SET potential_name = REPLACE(potential_name, 'Weapon ATT', 'Attack Power')
WHERE potential_name LIKE '%Weapon ATT%';

UPDATE main_potential
SET potential_name = REPLACE(potential_name, 'Magic ATT', 'M. Attack Power')
WHERE potential_name LIKE '%Magic ATT%';

UPDATE bonus_potential
SET potential_name = REPLACE(potential_name, 'Magic ATT', 'M. Attack Power')
WHERE potential_name LIKE '%Magic ATT%';

-- 2. Convert text percentages/values to numeric form (keeping as text temporarily for safe update)
-- Logic: If contains %, remove % and + then divide by 100. Else remove +.

-- Main Potential 71+
UPDATE main_potential
SET val_71 = CASE 
    WHEN val_71 LIKE '%\%%' THEN CAST(CAST(REPLACE(REPLACE(val_71, '%', ''), '+', '') AS FLOAT) / 100 AS TEXT)
    ELSE REPLACE(val_71, '+', '')
END
WHERE val_71 IS NOT NULL;

-- Main Potential 151+
UPDATE main_potential
SET val_151 = CASE 
    WHEN val_151 LIKE '%\%%' THEN CAST(CAST(REPLACE(REPLACE(val_151, '%', ''), '+', '') AS FLOAT) / 100 AS TEXT)
    ELSE REPLACE(val_151, '+', '')
END
WHERE val_151 IS NOT NULL;

-- Bonus Potential 71+
UPDATE bonus_potential
SET val_71 = CASE 
    WHEN val_71 LIKE '%\%%' THEN CAST(CAST(REPLACE(REPLACE(val_71, '%', ''), '+', '') AS FLOAT) / 100 AS TEXT)
    ELSE REPLACE(val_71, '+', '')
END
WHERE val_71 IS NOT NULL;

-- Bonus Potential 151+
UPDATE bonus_potential
SET val_151 = CASE 
    WHEN val_151 LIKE '%\%%' THEN CAST(CAST(REPLACE(REPLACE(val_151, '%', ''), '+', '') AS FLOAT) / 100 AS TEXT)
    ELSE REPLACE(val_151, '+', '')
END
WHERE val_151 IS NOT NULL;


-- 3. Alter Column Types to Numeric (Using USING clause for PostgreSQL casting)
ALTER TABLE main_potential
ALTER COLUMN val_71 TYPE NUMERIC USING val_71::NUMERIC,
ALTER COLUMN val_151 TYPE NUMERIC USING val_151::NUMERIC;

ALTER TABLE bonus_potential
ALTER COLUMN val_71 TYPE NUMERIC USING val_71::NUMERIC,
ALTER COLUMN val_151 TYPE NUMERIC USING val_151::NUMERIC;
