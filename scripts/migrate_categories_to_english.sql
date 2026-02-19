-- Migrate Categories and Subcategories to English

-- 1. Updates for 'transactions' table
UPDATE transactions SET category = 'Housing & Services' WHERE category = 'Vivienda y Servicios';
UPDATE transactions SET category = 'Daily Life' WHERE category = 'Vida Diaria';
UPDATE transactions SET category = 'Transport & Vehicle' WHERE category = 'Transporte y Vehículo';
UPDATE transactions SET category = 'Entertainment & Development' WHERE category = 'Entretenimiento y Desarrollo';
UPDATE transactions SET category = 'Financial' WHERE category = 'Financiero';
UPDATE transactions SET category = 'Work' WHERE category = 'Trabajo';

UPDATE transactions SET subcategory = 'Rent & Utilities' WHERE subcategory = 'Alquiler y Expensas';
UPDATE transactions SET subcategory = 'Services' WHERE subcategory = 'Servicios';
UPDATE transactions SET subcategory = 'Maintenance & Home' WHERE subcategory = 'Mantenimiento y Hogar';
UPDATE transactions SET subcategory = 'Food & Dining' WHERE subcategory = 'Alimentación';
UPDATE transactions SET subcategory = 'Health' WHERE subcategory = 'Salud';
UPDATE transactions SET subcategory = 'Personal Care' WHERE subcategory = 'Cuidado Personal';
UPDATE transactions SET subcategory = 'Clothing & Footwear' WHERE subcategory = 'Ropa y Calzado';
UPDATE transactions SET subcategory = 'Miscellaneous' WHERE subcategory = 'Gastos Varios';
UPDATE transactions SET subcategory = 'Public Transport' WHERE subcategory = 'Transporte Público';
UPDATE transactions SET subcategory = 'My Vehicle' WHERE subcategory = 'Mi Vehículo';
UPDATE transactions SET subcategory = 'Social & Outings' WHERE subcategory = 'Salidas';
UPDATE transactions SET subcategory = 'Digital Leisure' WHERE subcategory = 'Ocio Digital';
UPDATE transactions SET subcategory = 'Travel & Vacations' WHERE subcategory = 'Viajes y Vacaciones';
UPDATE transactions SET subcategory = 'Education' WHERE subcategory = 'Educación';
UPDATE transactions SET subcategory = 'Investments & Returns' WHERE subcategory = 'Inversiones y Rendimientos';
UPDATE transactions SET subcategory = 'Fees & Commissions' WHERE subcategory = 'Comisiones y Tasas';
UPDATE transactions SET subcategory = 'Loans' WHERE subcategory = 'Préstamos';
UPDATE transactions SET subcategory = 'Items / Cubes' WHERE subcategory = 'Items/Cubos';
UPDATE transactions SET subcategory = 'Operating Expenses' WHERE subcategory = 'Gastos Operativos';
UPDATE transactions SET subcategory = 'Salaries & Fees' WHERE subcategory = 'Sueldos y Honorarios';
UPDATE transactions SET subcategory = 'Other Work Income' WHERE subcategory = 'Otros Ingresos Laborales';

-- 2. Updates for 'transactions_mesos' table
UPDATE transactions_mesos SET category = 'Housing & Services' WHERE category = 'Vivienda y Servicios';
UPDATE transactions_mesos SET category = 'Daily Life' WHERE category = 'Vida Diaria';
UPDATE transactions_mesos SET category = 'Transport & Vehicle' WHERE category = 'Transporte y Vehículo';
UPDATE transactions_mesos SET category = 'Entertainment & Development' WHERE category = 'Entretenimiento y Desarrollo';
UPDATE transactions_mesos SET category = 'Financial' WHERE category = 'Financiero';
UPDATE transactions_mesos SET category = 'Work' WHERE category = 'Trabajo';

UPDATE transactions_mesos SET subcategory = 'Rent & Utilities' WHERE subcategory = 'Alquiler y Expensas';
UPDATE transactions_mesos SET subcategory = 'Services' WHERE subcategory = 'Servicios';
UPDATE transactions_mesos SET subcategory = 'Maintenance & Home' WHERE subcategory = 'Mantenimiento y Hogar';
UPDATE transactions_mesos SET subcategory = 'Food & Dining' WHERE subcategory = 'Alimentación';
UPDATE transactions_mesos SET subcategory = 'Health' WHERE subcategory = 'Salud';
UPDATE transactions_mesos SET subcategory = 'Personal Care' WHERE subcategory = 'Cuidado Personal';
UPDATE transactions_mesos SET subcategory = 'Clothing & Footwear' WHERE subcategory = 'Ropa y Calzado';
UPDATE transactions_mesos SET subcategory = 'Miscellaneous' WHERE subcategory = 'Gastos Varios';
UPDATE transactions_mesos SET subcategory = 'Public Transport' WHERE subcategory = 'Transporte Público';
UPDATE transactions_mesos SET subcategory = 'My Vehicle' WHERE subcategory = 'Mi Vehículo';
UPDATE transactions_mesos SET subcategory = 'Social & Outings' WHERE subcategory = 'Salidas';
UPDATE transactions_mesos SET subcategory = 'Digital Leisure' WHERE subcategory = 'Ocio Digital';
UPDATE transactions_mesos SET subcategory = 'Travel & Vacations' WHERE subcategory = 'Viajes y Vacaciones';
UPDATE transactions_mesos SET subcategory = 'Education' WHERE subcategory = 'Educación';
UPDATE transactions_mesos SET subcategory = 'Investments & Returns' WHERE subcategory = 'Inversiones y Rendimientos';
UPDATE transactions_mesos SET subcategory = 'Fees & Commissions' WHERE subcategory = 'Comisiones y Tasas';
UPDATE transactions_mesos SET subcategory = 'Loans' WHERE subcategory = 'Préstamos';
UPDATE transactions_mesos SET subcategory = 'Items / Cubes' WHERE subcategory = 'Items/Cubos';
UPDATE transactions_mesos SET subcategory = 'Operating Expenses' WHERE subcategory = 'Gastos Operativos';
UPDATE transactions_mesos SET subcategory = 'Salaries & Fees' WHERE subcategory = 'Sueldos y Honorarios';
UPDATE transactions_mesos SET subcategory = 'Other Work Income' WHERE subcategory = 'Otros Ingresos Laborales';

-- 3. Updates for 'accounts_receivable' table
UPDATE accounts_receivable SET category = 'Housing & Services' WHERE category = 'Vivienda y Servicios';
UPDATE accounts_receivable SET category = 'Daily Life' WHERE category = 'Vida Diaria';
UPDATE accounts_receivable SET category = 'Transport & Vehicle' WHERE category = 'Transporte y Vehículo';
UPDATE accounts_receivable SET category = 'Entertainment & Development' WHERE category = 'Entretenimiento y Desarrollo';
UPDATE accounts_receivable SET category = 'Financial' WHERE category = 'Financiero';
UPDATE accounts_receivable SET category = 'Work' WHERE category = 'Trabajo';

UPDATE accounts_receivable SET subcategory = 'Rent & Utilities' WHERE subcategory = 'Alquiler y Expensas';
UPDATE accounts_receivable SET subcategory = 'Services' WHERE subcategory = 'Servicios';
UPDATE accounts_receivable SET subcategory = 'Maintenance & Home' WHERE subcategory = 'Mantenimiento y Hogar';
UPDATE accounts_receivable SET subcategory = 'Food & Dining' WHERE subcategory = 'Alimentación';
UPDATE accounts_receivable SET subcategory = 'Health' WHERE subcategory = 'Salud';
UPDATE accounts_receivable SET subcategory = 'Personal Care' WHERE subcategory = 'Cuidado Personal';
UPDATE accounts_receivable SET subcategory = 'Clothing & Footwear' WHERE subcategory = 'Ropa y Calzado';
UPDATE accounts_receivable SET subcategory = 'Miscellaneous' WHERE subcategory = 'Gastos Varios';
UPDATE accounts_receivable SET subcategory = 'Public Transport' WHERE subcategory = 'Transporte Público';
UPDATE accounts_receivable SET subcategory = 'My Vehicle' WHERE subcategory = 'Mi Vehículo';
UPDATE accounts_receivable SET subcategory = 'Social & Outings' WHERE subcategory = 'Salidas';
UPDATE accounts_receivable SET subcategory = 'Digital Leisure' WHERE subcategory = 'Ocio Digital';
UPDATE accounts_receivable SET subcategory = 'Travel & Vacations' WHERE subcategory = 'Viajes y Vacaciones';
UPDATE accounts_receivable SET subcategory = 'Education' WHERE subcategory = 'Educación';
UPDATE accounts_receivable SET subcategory = 'Investments & Returns' WHERE subcategory = 'Inversiones y Rendimientos';
UPDATE accounts_receivable SET subcategory = 'Fees & Commissions' WHERE subcategory = 'Comisiones y Tasas';
UPDATE accounts_receivable SET subcategory = 'Loans' WHERE subcategory = 'Préstamos';
UPDATE accounts_receivable SET subcategory = 'Items / Cubes' WHERE subcategory = 'Items/Cubos';
UPDATE accounts_receivable SET subcategory = 'Operating Expenses' WHERE subcategory = 'Gastos Operativos';
UPDATE accounts_receivable SET subcategory = 'Salaries & Fees' WHERE subcategory = 'Sueldos y Honorarios';
UPDATE accounts_receivable SET subcategory = 'Other Work Income' WHERE subcategory = 'Otros Ingresos Laborales';
