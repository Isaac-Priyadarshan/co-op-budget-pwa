-- ============================================================
-- Migration: 20260715_backfill_budgets_category_id
-- Version:   20260715074854
-- Author:    Senior Dev — Co-Op Budget PWA
-- Purpose:   budgets.category_id has always been NULL because
--            upsertBudget() never wrote it.  We backfill from
--            subcategories.category_id (the parent UUID), add
--            a safety guard, enforce NOT NULL, and document
--            all 4 category-related columns with COMMENTs.
--
--            transactions.category_id is intentionally nullable
--            (transfer rows carry no category) — no change there.
-- ============================================================

-- Step 1: Backfill category_id for every existing budget row
-- by joining through subcategories → categories.
UPDATE budgets b
SET    category_id = s.category_id
FROM   subcategories s
WHERE  b.subcategory_id = s.id
  AND  b.category_id IS NULL;

-- Step 2: Safety guard — abort if any row is still NULL after
-- backfill (indicates an orphaned subcategory_id reference).
DO $$
DECLARE
  orphan_count integer;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM budgets
  WHERE category_id IS NULL;

  IF orphan_count > 0 THEN
    RAISE EXCEPTION
      'Migration aborted: % budget row(s) still have NULL category_id after backfill. '
      'Check for orphaned subcategory_id references before re-running.',
      orphan_count;
  END IF;
END;
$$;

-- Step 3: Enforce NOT NULL now that all rows are populated.
ALTER TABLE budgets
  ALTER COLUMN category_id SET NOT NULL;

-- Step 4: Document every category-related column in budgets
-- so intent is self-evident to future developers.
COMMENT ON COLUMN budgets.category IS
  'Subcategory label (e.g. "Oil", "Gym"). Used for display and spend '
  'matching in BudgetScreen. Written by upsertBudget().';

COMMENT ON COLUMN budgets.parent_category IS
  'Parent category label (e.g. "Food and Drinks"). Used for group '
  'totals in BudgetScreen. Written by upsertBudget().';

COMMENT ON COLUMN budgets.category_id IS
  'Parent category UUID (FK → categories.id). NOT NULL. '
  'Backfilled 2026-07-15 from subcategories.category_id. '
  'Always written by upsertBudget().';

COMMENT ON COLUMN budgets.subcategory_id IS
  'Subcategory UUID (FK → subcategories.id). Part of the UNIQUE '
  '(subcategory_id, month) constraint that prevents duplicate budget rows.';
