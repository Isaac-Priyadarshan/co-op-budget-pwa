-- ============================================================
-- Migration: add_sort_order_and_backfill_tickers_assets
-- Date     : 2026-07-14
-- Purpose  : 1. Add sort_order column to assets table
--            2. Backfill ticker symbols extracted from labels
--            3. Assign sort_order per category group
--            4. Add index for fast sort_order queries
-- ============================================================

-- 1. Add sort_order column (nullable int, default null initially)
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- 2. Backfill ticker symbols for Stock category assets
--    Extract ticker from label pattern: "LABEL (TICKER)"
UPDATE assets
SET ticker = 'HDFCBANK.BO'
WHERE id = '116eece4-4e07-40cc-ac52-e37829d8c060'
  AND ticker IS NULL;

UPDATE assets
SET ticker = 'OLAELEC.NS'
WHERE id = 'a3e4b09a-8bcd-4f10-90de-56bd18aec631'
  AND ticker IS NULL;

-- 3. Assign sort_order — Stocks first (they have live price sync),
--    then Bank assets ordered by label
UPDATE assets
SET sort_order = 1
WHERE id = '116eece4-4e07-40cc-ac52-e37829d8c060'; -- HDFC BANK Stock

UPDATE assets
SET sort_order = 2
WHERE id = 'a3e4b09a-8bcd-4f10-90de-56bd18aec631'; -- OLA ELECTRIC Stock

UPDATE assets
SET sort_order = 3
WHERE id = 'abe9fe38-8531-48bf-a191-ffd22dccb824'; -- Canara RD (1)

UPDATE assets
SET sort_order = 4
WHERE id = 'dadfd583-8284-4fd9-8a1e-0d8ba854f778'; -- Canara RD (2)

UPDATE assets
SET sort_order = 5
WHERE id = '60aab05d-f060-4bea-966a-8e693815a5c9'; -- HDFC FD (1)

UPDATE assets
SET sort_order = 6
WHERE id = 'c569a66e-d492-4a5a-a830-f7d037c2ecc0'; -- HDFC FD (2)

UPDATE assets
SET sort_order = 7
WHERE id = '623d97d4-eca2-42e6-84e7-dc9a193fb557'; -- HDFC FD (3)

-- 4. Add index for sort_order to speed up ordered fetches
CREATE INDEX IF NOT EXISTS idx_assets_sort_order
  ON assets (sort_order ASC NULLS LAST);

-- 5. Set default for new rows going forward
ALTER TABLE assets
  ALTER COLUMN sort_order SET DEFAULT 9999;
