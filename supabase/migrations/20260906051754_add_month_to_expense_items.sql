-- Add month column to expense_items so analytics can group expenses by month
ALTER TABLE expense_items ADD COLUMN IF NOT EXISTS month date;

-- Backfill: set existing expense items to the current month
UPDATE expense_items SET month = date_trunc('month', created_at)::date WHERE month IS NULL;

-- Make it NOT NULL going forward
ALTER TABLE expense_items ALTER COLUMN month SET NOT NULL;
