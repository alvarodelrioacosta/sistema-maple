-- 1. Función para recalcular el balance de una cuenta específica
CREATE OR REPLACE FUNCTION calculate_and_sync_account_balance(account_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE financial_accounts
  SET balance = (
    SELECT COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' THEN t.amount
        WHEN t.type = 'expense' THEN -t.amount
        WHEN t.type = 'transfer' AND t.description ILIKE '%transfer from%' THEN t.amount
        WHEN t.type = 'transfer' AND t.description ILIKE '%transfer to%' THEN -t.amount
        ELSE 0
      END
    ), 0)
    FROM transactions t
    WHERE t.financial_account_id = account_id
  )
  WHERE id = account_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Función de trigger para llamar a la sincronización
CREATE OR REPLACE FUNCTION trigger_sync_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Sincronizar cuenta afectada (nueva o vieja en caso de UPDATE/DELETE)
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF (NEW.financial_account_id IS NOT NULL) THEN
      PERFORM calculate_and_sync_account_balance(NEW.financial_account_id);
    END IF;
  END IF;
  
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
    IF (OLD.financial_account_id IS NOT NULL AND (TG_OP = 'DELETE' OR OLD.financial_account_id <> NEW.financial_account_id)) THEN
      PERFORM calculate_and_sync_account_balance(OLD.financial_account_id);
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear Triggers en la tabla transactions
DROP TRIGGER IF EXISTS trg_sync_balance_on_transaction_change ON transactions;
CREATE TRIGGER trg_sync_balance_on_transaction_change
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_sync_account_balance();

-- 4. SINCRONIZACIÓN INICIAL: Corregir balances actuales basándose en todo el historial
DO $$
DECLARE
    acc_record RECORD;
BEGIN
    FOR acc_record IN SELECT id FROM financial_accounts LOOP
        PERFORM calculate_and_sync_account_balance(acc_record.id);
    END LOOP;
END $$;
