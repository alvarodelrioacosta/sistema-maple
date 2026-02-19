-- Add payment agreement tracking to clients
ALTER TABLE clients
ADD COLUMN next_payment_date DATE;

ALTER TABLE clients
ADD COLUMN payment_agreement TEXT;
