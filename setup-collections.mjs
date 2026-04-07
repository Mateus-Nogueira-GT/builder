import { createClient } from '@supabase/supabase-js';

const WIX_API_KEY = 'IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcIjBmNjE4ZGJhLWY0MjAtNGQwOS05OGRmLTdmNDA0ZDlhNGM5MlwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcIjNkYWVmYzQyLWJmZDctNDI0Zi05MzM4LTdmMjllZjc5NmFhNFwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCJhOTBlYjI0Mi04OGQ2LTRlOGUtYTIzMi1mMTA5NGMzODg2YmJcIn19IiwiaWF0IjoxNzc0MjkzNDk1fQ.HFVUAmUAgbe36K6m3dlGkc9DGqow6TO9_WxmbE82dqObYDDw1TVpjU0U8_eW2byjGKPf7gcsp5-EBLZJt7e7mTU1LAFEq2tarDwJ4QWSnqIBSsspwPEF4uaY-FJZZlQS1HGqap_-oOgZLciX_YHrFRss1q61CdpvzsKk-Dd6l2wQ2MUSfu2A48bZd81TI9cogLY55qGSc_yygepbU6L8lKSOud8lSw4fudnDq7ANFgvdyKrGgSGe2B4Uw9D-JQeuktgy-eykM2hF1e9b7aK39DH_-iY7Zed9dI2C-Xehp4lY7MJLuyUC_fYU5Rf2YS-12oM2SqpO7L6mHzWcmkg-AQ';

const SITES = [
  { id: 'c208eaf8-8ed3-4ad2-947a-db65813006c2', name: 'Template 1' },
  { id: '962b66f7-c9d1-4ba7-be05-354465e71d40', name: 'Template 2' },
  { id: 'da927d82-5f52-46a6-bc33-9210fb916aaa', name: 'Template 3' },
];

const CATEGORIES = [
  'Brasileirão', 'Europa', 'Seleções', 'Retrô',
  'Premier League', 'La Liga', 'Bundesliga', 'Serie A',
  'Américas', 'Times da Copa', 'Manga Longa', 'Femininas',
  'Conjunto Infantil',
];

const SITE_ARG = process.argv[2] ? parseInt(process.argv[2]) : null;

async function createCollection(siteId, name) {
  const res = await fetch('https://www.wixapis.com/stores/v1/collections', {
    method: 'POST',
    headers: { Authorization: WIX_API_KEY, 'wix-site-id': siteId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ collection: { name } }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    if (err.includes('already exists') || err.includes('ALREADY_EXISTS')) return null;
    console.error(`  Failed to create "${name}": ${err.slice(0, 100)}`);
    return null;
  }
  const data = await res.json();
  return data.collection?.id;
}

async function queryCollections(siteId) {
  const res = await fetch('https://www.wixapis.com/stores/v1/collections/query', {
    method: 'POST',
    headers: { Authorization: WIX_API_KEY, 'wix-site-id': siteId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: {} }),
  });
  if (!res.ok) return {};
  const data = await res.json();
  const map = {};
  for (const c of data.collections || []) {
    map[c.name] = c.id;
  }
  return map;
}

async function addProductToCollection(siteId, collectionId, productId) {
  await fetch(`https://www.wixapis.com/stores/v1/collections/${collectionId}/productIds`, {
    method: 'POST',
    headers: { Authorization: WIX_API_KEY, 'wix-site-id': siteId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ productIds: [productId] }),
  });
}

async function queryProducts(siteId, offset = 0, limit = 100) {
  const res = await fetch('https://www.wixapis.com/stores/v1/products/query', {
    method: 'POST',
    headers: { Authorization: WIX_API_KEY, 'wix-site-id': siteId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { paging: { limit, offset } } }),
  });
  if (!res.ok) return { products: [], totalResults: 0 };
  return res.json();
}

// Get category_cache from external Supabase for matching
const externalSupabase = createClient(
  'https://xygzdgqlztucmhpkolvx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5Z3pkZ3FsenR1Y21ocGtvbHZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg2MzEwMCwiZXhwIjoyMDg1NDM5MTAwfQ._IpO27SbiOmJZrh9YOph6NSi_lwgv0ZNeycZJ28r-DQ'
);

async function getCategoryMap() {
  console.log('Building SKU → categories map from Supabase...');
  const map = {};
  let offset = 0;
  while (true) {
    const { data, error } = await externalSupabase
      .from('catalog_products')
      .select('sku, category_cache')
      .range(offset, offset + 999);
    if (error || !data || data.length === 0) break;
    for (const p of data) {
      if (p.sku && p.category_cache) map[p.sku] = p.category_cache;
    }
    offset += 1000;
    if (data.length < 1000) break;
  }
  console.log(`  Loaded ${Object.keys(map).length} SKU mappings\n`);
  return map;
}

async function processSite(site, skuCategoryMap) {
  console.log(`\n=== ${site.name} (${site.id}) ===\n`);

  // 1. Create collections
  console.log('Creating collections...');
  for (const cat of CATEGORIES) {
    await createCollection(site.id, cat);
    await new Promise(r => setTimeout(r, 200));
  }

  // 2. Get collection IDs
  const collectionMap = await queryCollections(site.id);
  console.log(`Collections: ${Object.keys(collectionMap).length}`);
  for (const [name, id] of Object.entries(collectionMap)) {
    if (CATEGORIES.includes(name)) console.log(`  ${name} → ${id}`);
  }

  // 3. Get all products and assign to collections
  const first = await queryProducts(site.id, 0, 1);
  const total = first.totalResults || 0;
  console.log(`\nAssigning ${total} products to collections...`);

  let assigned = 0;
  for (let offset = 0; offset < total; offset += 100) {
    const data = await queryProducts(site.id, offset, 100);
    const products = data.products || [];

    for (const product of products) {
      const sku = product.sku;
      const categories = skuCategoryMap[sku] || [];

      for (const cat of categories) {
        const collId = collectionMap[cat];
        if (collId) {
          try {
            await addProductToCollection(site.id, collId, product.id);
            assigned++;
          } catch { /* continue */ }
          await new Promise(r => setTimeout(r, 100));
        }
      }
    }

    console.log(`  Batch ${Math.floor(offset / 100) + 1}: ${assigned} assignments so far`);
  }

  console.log(`\nDone: ${assigned} product-collection assignments`);
}

async function main() {
  const skuMap = await getCategoryMap();
  const sites = SITE_ARG !== null ? [SITES[SITE_ARG]] : SITES;

  for (const site of sites) {
    await processSite(site, skuMap);
  }
}

main().catch(console.error);
