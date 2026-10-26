-- For existing V3 database: first apply daily-offers-upgrade.sql if missing.
ALTER TABLE public.daily_offers ADD COLUMN IF NOT EXISTS original_price numeric(12,2);
ALTER TABLE public.daily_offers ADD COLUMN IF NOT EXISTS offer_price numeric(12,2);
-- Previously published offers had no discount. Deactivate them before enforcing new prices.
UPDATE public.daily_offers SET active=false WHERE original_price IS NULL OR offer_price IS NULL;
ALTER TABLE public.daily_offers DROP CONSTRAINT IF EXISTS daily_offer_price_valid;
ALTER TABLE public.daily_offers ADD CONSTRAINT daily_offer_price_valid CHECK (offer_price>0 AND offer_price<original_price);
