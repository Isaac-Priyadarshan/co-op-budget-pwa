-- Migration: Add live market data columns to assets table
-- Run this in Supabase SQL Editor

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS ticker        text,
  ADD COLUMN IF NOT EXISTS quantity      numeric,
  ADD COLUMN IF NOT EXISTS buy_price     numeric,
  ADD COLUMN IF NOT EXISTS current_price numeric,
  ADD COLUMN IF NOT EXISTS last_synced   timestamptz;

COMMENT ON COLUMN assets.ticker        IS 'Stock NSE symbol / MF scheme code / CoinGecko coin id / metal key';
COMMENT ON COLUMN assets.quantity      IS 'Shares / MF units / crypto qty / grams';
COMMENT ON COLUMN assets.buy_price     IS 'Price per unit at time of purchase';
COMMENT ON COLUMN assets.current_price IS 'Latest synced market price per unit';
COMMENT ON COLUMN assets.last_synced   IS 'When current_price was last updated';
