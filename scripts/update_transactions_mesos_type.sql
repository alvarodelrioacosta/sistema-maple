-- Migration to support transfers and shared vault in transactions_mesos
-- 1. Make account_id nullable for Shared Vault transactions
ALTER TABLE public.transactions_mesos ALTER COLUMN account_id DROP NOT NULL;

-- 2. Update type allowed values to include 'transfer'
ALTER TABLE public.transactions_mesos DROP CONSTRAINT IF EXISTS transactions_mesos_type_check;
ALTER TABLE public.transactions_mesos ADD CONSTRAINT transactions_mesos_type_check CHECK (type IN ('income', 'expense', 'transfer'));
