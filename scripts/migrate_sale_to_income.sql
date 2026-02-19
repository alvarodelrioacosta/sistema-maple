-- Migrar transacciones de tipo 'sale' a 'income'
UPDATE public.transactions 
SET type = 'income' 
WHERE type = 'sale';

-- Actualizar la restricción de tipo para eliminar 'sale'
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('income', 'expense', 'transfer'));
