-- Migration: add `sizes` column to catalog_products and populate for combo TORCEDOR
-- Run on the EXTERNAL Supabase project (xygzdgqlztucmhpkolvx) in SQL Editor.
-- Date: 2026-04-27

-- 1) Add the column. text[] (array of strings) so it carries any size labels.
--    Default empty array avoids null-handling everywhere; existing rows get [].
ALTER TABLE public.catalog_products
  ADD COLUMN IF NOT EXISTS sizes text[] NOT NULL DEFAULT '{}';

-- 2) Populate sizes for every product that belongs to combo TORCEDOR.
--    Uses products_group as the bridge.
UPDATE public.catalog_products AS cp
SET sizes = ARRAY['P', 'M', 'G', 'GG', 'G1', 'G2']
WHERE cp.id IN (
  SELECT pg.catalog_product_id
  FROM public.products_group AS pg
  WHERE pg.group_name = 'TORCEDOR'
);

-- 3) Sanity check (run separately, not part of the migration):
-- SELECT count(*) FROM public.catalog_products WHERE cardinality(sizes) > 0;
-- SELECT id, sku, sizes FROM public.catalog_products WHERE cardinality(sizes) > 0 LIMIT 5;

-- Rollback (only if you need to undo):
-- ALTER TABLE public.catalog_products DROP COLUMN sizes;
