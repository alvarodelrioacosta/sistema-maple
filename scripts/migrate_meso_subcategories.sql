-- Migración para actualizar subcategorías en transactions_mesos
UPDATE transactions_mesos
SET 
  category = 'Mesos',
  subcategory = 'Items / Cubes'
WHERE subcategory IS NULL OR subcategory != 'Items / Cubes';
