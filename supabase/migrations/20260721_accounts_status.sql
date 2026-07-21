-- Add a three-value status enum alongside the existing owned boolean.
-- owned=true  -> 'owned' (Propia)
-- owned=false -> 'sold'  (Vendida)
-- New value   -> 'banned' (Baneada): account + all derived data hidden app-wide.
-- `owned` is dropped in a later migration once no code references it.

ALTER TABLE accounts
  ADD COLUMN status text NOT NULL DEFAULT 'owned'
  CHECK (status IN ('owned','sold','banned'));

UPDATE accounts SET status = CASE WHEN owned THEN 'owned' ELSE 'sold' END;
