
-- Update Item Types as requested by User
-- Tables: main_potential, bonus_potential

-- 1. Change "Accessory" -> "ALL"
UPDATE main_potential 
SET item_type = 'ALL' 
WHERE item_type = 'Accessory';

UPDATE bonus_potential 
SET item_type = 'ALL' 
WHERE item_type = 'Accessory';

-- 2. Change "Weapon" -> "WES"
UPDATE main_potential 
SET item_type = 'WES' 
WHERE item_type = 'Weapon';

UPDATE bonus_potential 
SET item_type = 'WES' 
WHERE item_type = 'Weapon';
