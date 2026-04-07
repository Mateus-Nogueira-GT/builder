import { createClient } from '@supabase/supabase-js';

const WIX_API_KEY = 'IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcIjBmNjE4ZGJhLWY0MjAtNGQwOS05OGRmLTdmNDA0ZDlhNGM5MlwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcIjNkYWVmYzQyLWJmZDctNDI0Zi05MzM4LTdmMjllZjc5NmFhNFwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCJhOTBlYjI0Mi04OGQ2LTRlOGUtYTIzMi1mMTA5NGMzODg2YmJcIn19IiwiaWF0IjoxNzc0MjkzNDk1fQ.HFVUAmUAgbe36K6m3dlGkc9DGqow6TO9_WxmbE82dqObYDDw1TVpjU0U8_eW2byjGKPf7gcsp5-EBLZJt7e7mTU1LAFEq2tarDwJ4QWSnqIBSsspwPEF4uaY-FJZZlQS1HGqap_-oOgZLciX_YHrFRss1q61CdpvzsKk-Dd6l2wQ2MUSfu2A48bZd81TI9cogLY55qGSc_yygepbU6L8lKSOud8lSw4fudnDq7ANFgvdyKrGgSGe2B4Uw9D-JQeuktgy-eykM2hF1e9b7aK39DH_-iY7Zed9dI2C-Xehp4lY7MJLuyUC_fYU5Rf2YS-12oM2SqpO7L6mHzWcmkg-AQ';

const externalSupabase = createClient(
  'https://xygzdgqlztucmhpkolvx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5Z3pkZ3FsenR1Y21ocGtvbHZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg2MzEwMCwiZXhwIjoyMDg1NDM5MTAwfQ._IpO27SbiOmJZrh9YOph6NSi_lwgv0ZNeycZJ28r-DQ'
);

const SITES = [
  'c208eaf8-8ed3-4ad2-947a-db65813006c2',
  '962b66f7-c9d1-4ba7-be05-354465e71d40',
  'da927d82-5f52-46a6-bc33-9210fb916aaa',
];

const SITE_ARG = process.argv[2];
const siteIndex = SITE_ARG ? parseInt(SITE_ARG) : 0;
const SITE_ID = SITES[siteIndex];

console.log(`\n=== Injecting products into site ${siteIndex + 1}/3: ${SITE_ID} ===\n`);

// 1. Get all TORCEDOR product IDs
async function getAllProductIds() {
  const allIds = [];
  let offset = 0;
  while (true) {
    const { data, error } = await externalSupabase
      .from('products_group')
      .select('catalog_product_id')
      .eq('group_name', 'TORCEDOR')
      .range(offset, offset + 999);
    if (error || !data || data.length === 0) break;
    allIds.push(...data.map(r => r.catalog_product_id));
    offset += 1000;
    if (data.length < 1000) break;
  }
  return allIds;
}

// 2. Fetch product details
async function fetchProducts(ids) {
  const { data, error } = await externalSupabase
    .from('catalog_products')
    .select('id, sku, name, description, images, variants, is_published')
    .in('id', ids);
  if (error) { console.error('Fetch error:', error.message); return []; }
  return data || [];
}

// 3. Create product on Wix
async function createProduct(siteId, product) {
  const name = (product.name?.pt || 'Produto').slice(0, 80);
  const description = (product.description?.pt || '').slice(0, 7999);
  const price = parseFloat(product.variants?.[0]?.price || '0') || 0;
  const sku = product.sku || '';

  const res = await fetch('https://www.wixapis.com/stores/v1/products', {
    method: 'POST',
    headers: {
      Authorization: WIX_API_KEY,
      'wix-site-id': siteId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product: { name, description, productType: 'physical', priceData: { price, currency: 'BRL' }, sku, visible: true }
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    if (err.includes('not unique')) return { id: null, skipped: true };
    throw new Error(`${res.status}: ${err.slice(0, 100)}`);
  }

  const data = await res.json();
  const productId = data.product?.id;

  // Add images
  if (productId && product.images?.length > 0) {
    const media = product.images
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .slice(0, 5)
      .map(img => ({ url: img.src }));

    await fetch(`https://www.wixapis.com/stores/v1/products/${productId}/media`, {
      method: 'POST',
      headers: {
        Authorization: WIX_API_KEY,
        'wix-site-id': siteId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ media }),
    }).catch(() => {});
  }

  return { id: productId, skipped: false };
}

// Main
async function main() {
  console.log('Fetching TORCEDOR product IDs...');
  const allIds = await getAllProductIds();
  console.log(`Total: ${allIds.length} products\n`);

  let created = 0, failed = 0, skipped = 0;
  const batchSize = 100;

  for (let offset = 0; offset < allIds.length; offset += batchSize) {
    const batchIds = allIds.slice(offset, offset + batchSize);
    const products = await fetchProducts(batchIds);

    console.log(`Batch ${Math.floor(offset / batchSize) + 1}/${Math.ceil(allIds.length / batchSize)}: ${products.length} products`);

    for (const product of products) {
      try {
        const result = await createProduct(SITE_ID, product);
        if (result.skipped) { skipped++; }
        else { created++; }
      } catch (err) {
        failed++;
        if (failed <= 5) console.error(`  FAIL: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 250));
    }

    console.log(`  Progress: ${created} created, ${skipped} skipped, ${failed} failed\n`);
  }

  console.log(`\n=== DONE === Site ${siteIndex + 1}: ${created} created, ${skipped} skipped (duplicate SKU), ${failed} failed`);
}

main().catch(console.error);
