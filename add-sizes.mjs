import { createClient } from '@supabase/supabase-js';

const WIX_API_KEY = 'IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcIjBmNjE4ZGJhLWY0MjAtNGQwOS05OGRmLTdmNDA0ZDlhNGM5MlwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcIjNkYWVmYzQyLWJmZDctNDI0Zi05MzM4LTdmMjllZjc5NmFhNFwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCJhOTBlYjI0Mi04OGQ2LTRlOGUtYTIzMi1mMTA5NGMzODg2YmJcIn19IiwiaWF0IjoxNzc0MjkzNDk1fQ.HFVUAmUAgbe36K6m3dlGkc9DGqow6TO9_WxmbE82dqObYDDw1TVpjU0U8_eW2byjGKPf7gcsp5-EBLZJt7e7mTU1LAFEq2tarDwJ4QWSnqIBSsspwPEF4uaY-FJZZlQS1HGqap_-oOgZLciX_YHrFRss1q61CdpvzsKk-Dd6l2wQ2MUSfu2A48bZd81TI9cogLY55qGSc_yygepbU6L8lKSOud8lSw4fudnDq7ANFgvdyKrGgSGe2B4Uw9D-JQeuktgy-eykM2hF1e9b7aK39DH_-iY7Zed9dI2C-Xehp4lY7MJLuyUC_fYU5Rf2YS-12oM2SqpO7L6mHzWcmkg-AQ';

const externalSupabase = createClient(
  'https://xygzdgqlztucmhpkolvx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5Z3pkZ3FsenR1Y21ocGtvbHZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg2MzEwMCwiZXhwIjoyMDg1NDM5MTAwfQ._IpO27SbiOmJZrh9YOph6NSi_lwgv0ZNeycZJ28r-DQ'
);

const SITES = [
  { id: 'c208eaf8-8ed3-4ad2-947a-db65813006c2', name: 'Template 1' },
  { id: '962b66f7-c9d1-4ba7-be05-354465e71d40', name: 'Template 2' },
  { id: 'da927d82-5f52-46a6-bc33-9210fb916aaa', name: 'Template 3' },
];

// CLI args: [siteIndex] [--dry-run] [--limit N]
const args = process.argv.slice(2);
const flagDryRun = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const flagLimit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : null;
const siteArgRaw = args.find((a) => /^\d+$/.test(a));
const SITE_ARG = siteArgRaw !== undefined ? parseInt(siteArgRaw, 10) : null;

if (flagDryRun) console.log('** DRY RUN ** — no PATCH will be sent\n');
if (flagLimit !== null) console.log(`** LIMIT ** — stop after ${flagLimit} updated products per site\n`);

function buildSizeOption(sizes) {
  return {
    optionType: 'drop_down',
    name: 'Tamanho',
    choices: sizes.map((value) => ({ value, description: value })),
  };
}

async function queryProducts(siteId, offset = 0, limit = 100) {
  const res = await fetch('https://www.wixapis.com/stores/v1/products/query', {
    method: 'POST',
    headers: { Authorization: WIX_API_KEY, 'wix-site-id': siteId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { paging: { limit, offset } } }),
  });
  if (!res.ok) throw new Error(`Query failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function fetchSizesBySkus(skus) {
  const map = new Map();
  if (skus.length === 0) return map;
  const { data, error } = await externalSupabase
    .from('catalog_products')
    .select('sku, sizes')
    .in('sku', skus);
  if (error) throw new Error(`Supabase error: ${error.message}`);
  for (const row of data || []) {
    if (Array.isArray(row.sizes) && row.sizes.length > 0) {
      map.set(row.sku, row.sizes);
    }
  }
  return map;
}

async function patchProductOptions(siteId, productId, sizes) {
  const res = await fetch(`https://www.wixapis.com/stores/v1/products/${productId}`, {
    method: 'PATCH',
    headers: { Authorization: WIX_API_KEY, 'wix-site-id': siteId, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product: {
        productOptions: [buildSizeOption(sizes)],
        manageVariants: true,
      },
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    return { ok: false, error: `${res.status} ${errBody.slice(0, 200)}` };
  }
  return { ok: true };
}

async function processSite(site) {
  console.log(`\n=== ${site.name} (${site.id}) ===`);

  const first = await queryProducts(site.id, 0, 1);
  const total = first.totalResults || 0;
  console.log(`Total: ${total} products`);

  let updated = 0, skipped = 0, missing = 0, failed = 0;

  outer: for (let offset = 0; offset < total; offset += 100) {
    const data = await queryProducts(site.id, offset, 100);
    const products = data.products || [];

    const skus = products.map((p) => p.sku).filter(Boolean);
    const sizesBySku = await fetchSizesBySkus(skus);

    for (const p of products) {
      if (flagLimit !== null && updated >= flagLimit) {
        console.log(`  Limit ${flagLimit} reached, stopping.`);
        break outer;
      }

      const hasOptions = Array.isArray(p.productOptions) && p.productOptions.length > 0;
      if (hasOptions) {
        skipped++;
        continue;
      }

      const sizes = p.sku ? sizesBySku.get(p.sku) : null;
      if (!sizes) {
        missing++;
        continue;
      }

      if (flagDryRun) {
        console.log(`  [DRY] would PATCH ${p.id} (sku=${p.sku}, name="${p.name}") with sizes ${JSON.stringify(sizes)}`);
        updated++;
        continue;
      }

      const result = await patchProductOptions(site.id, p.id, sizes);
      if (result.ok) {
        updated++;
      } else {
        failed++;
        console.error(`  ✗ ${p.id} (sku=${p.sku}): ${result.error}`);
      }

      await new Promise((r) => setTimeout(r, 250));
    }

    console.log(`  Batch ${Math.floor(offset / 100) + 1}: ${updated} updated, ${skipped} skipped, ${missing} no-sizes, ${failed} failed`);
  }

  console.log(`Done [${site.name}]: ${updated} updated | ${skipped} already had options | ${missing} no sizes in catalog | ${failed} failed`);
  return { updated, skipped, missing, failed };
}

async function main() {
  const sites = SITE_ARG !== null ? [SITES[SITE_ARG]] : SITES;
  if (sites.some((s) => !s)) {
    console.error(`Invalid site index ${SITE_ARG}. Valid: 0..${SITES.length - 1}`);
    process.exit(1);
  }

  const totals = { updated: 0, skipped: 0, missing: 0, failed: 0 };
  for (const site of sites) {
    const r = await processSite(site);
    totals.updated += r.updated;
    totals.skipped += r.skipped;
    totals.missing += r.missing;
    totals.failed += r.failed;
  }

  console.log(`\n=== TOTAL ===`);
  console.log(`${totals.updated} updated | ${totals.skipped} already had options | ${totals.missing} no sizes in catalog | ${totals.failed} failed`);
  if (flagDryRun) console.log('(dry-run — nothing was actually PATCHed)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
