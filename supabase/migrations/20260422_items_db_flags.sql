-- Add 3 boolean flags to items_db catalog
ALTER TABLE items_db
  ADD COLUMN can_starforce    boolean NOT NULL DEFAULT true,
  ADD COLUMN infinite_trades  boolean NOT NULL DEFAULT false,
  ADD COLUMN always_tradeable boolean NOT NULL DEFAULT false;

-- Backfill infinite_trades from the existing slots = 0 convention
UPDATE items_db SET infinite_trades = true WHERE slots = 0;

-- Make remaining_trade_slots nullable on items (null = no limit)
ALTER TABLE items
  ALTER COLUMN remaining_trade_slots DROP NOT NULL,
  ALTER COLUMN remaining_trade_slots DROP DEFAULT;

-- Null out remaining_trade_slots for items whose catalog entry is infinite_trades
UPDATE items i
SET remaining_trade_slots = NULL
FROM items_db db
WHERE i.name = db.name AND db.infinite_trades = true;
