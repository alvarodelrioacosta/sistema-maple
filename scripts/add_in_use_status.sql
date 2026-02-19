-- Script para permitir el nuevo estado 'in_use' en la tabla de items
-- Ejecutar en el Editor SQL de Supabase

ALTER TABLE items DROP CONSTRAINT IF EXISTS items_status_check;

ALTER TABLE items 
    ADD CONSTRAINT items_status_check 
    CHECK (status IN ('bulk', 'in_progress', 'in_stock', 'for_sale', 'sold', 'Service', 'in_use'));
