
-- Identify and Delete Duplicates in bonus_potential
-- Criteria: Same item_type, rank, potential_name, val_71, val_151
-- Ranks: Unique, Legendary

WITH duplicates AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY item_type, rank, potential_name, val_71, val_151 
            ORDER BY id
        ) as row_num
    FROM 
        bonus_potential
    WHERE 
        rank IN ('Unique', 'Legendary')
)
DELETE FROM bonus_potential
WHERE id IN (
    SELECT id FROM duplicates WHERE row_num > 1
);

-- Verification: Check count of deleted items
-- (This part is just for manual run context, the DELETE returns count)
