const WIX_API_KEY = 'IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcIjBmNjE4ZGJhLWY0MjAtNGQwOS05OGRmLTdmNDA0ZDlhNGM5MlwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcIjNkYWVmYzQyLWJmZDctNDI0Zi05MzM4LTdmMjllZjc5NmFhNFwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCJhOTBlYjI0Mi04OGQ2LTRlOGUtYTIzMi1mMTA5NGMzODg2YmJcIn19IiwiaWF0IjoxNzc0MjkzNDk1fQ.HFVUAmUAgbe36K6m3dlGkc9DGqow6TO9_WxmbE82dqObYDDw1TVpjU0U8_eW2byjGKPf7gcsp5-EBLZJt7e7mTU1LAFEq2tarDwJ4QWSnqIBSsspwPEF4uaY-FJZZlQS1HGqap_-oOgZLciX_YHrFRss1q61CdpvzsKk-Dd6l2wQ2MUSfu2A48bZd81TI9cogLY55qGSc_yygepbU6L8lKSOud8lSw4fudnDq7ANFgvdyKrGgSGe2B4Uw9D-JQeuktgy-eykM2hF1e9b7aK39DH_-iY7Zed9dI2C-Xehp4lY7MJLuyUC_fYU5Rf2YS-12oM2SqpO7L6mHzWcmkg-AQ';

const NEW_PRICE = 189.90;

const SITES = [
  { id: 'c208eaf8-8ed3-4ad2-947a-db65813006c2', name: 'Template 1' },
  { id: '962b66f7-c9d1-4ba7-be05-354465e71d40', name: 'Template 2' },
  { id: 'da927d82-5f52-46a6-bc33-9210fb916aaa', name: 'Template 3' },
];

const SITE_ARG = process.argv[2] ? parseInt(process.argv[2]) : null;

async function queryProducts(siteId, offset = 0, limit = 100) {
  const res = await fetch('https://www.wixapis.com/stores/v1/products/query', {
    method: 'POST',
    headers: { Authorization: WIX_API_KEY, 'wix-site-id': siteId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { paging: { limit, offset } } }),
  });
  if (!res.ok) throw new Error(`Query failed: ${res.status}`);
  return res.json();
}

async function updatePrice(siteId, productId) {
  const res = await fetch(`https://www.wixapis.com/stores/v1/products/${productId}`, {
    method: 'PATCH',
    headers: { Authorization: WIX_API_KEY, 'wix-site-id': siteId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ product: { priceData: { price: NEW_PRICE, currency: 'BRL' } } }),
  });
  return res.ok;
}

async function processSite(site) {
  console.log(`\n=== ${site.name} (${site.id}) ===`);

  const first = await queryProducts(site.id, 0, 1);
  const total = first.totalResults || 0;
  console.log(`Total: ${total} products. Updating to R$${NEW_PRICE}...`);

  let updated = 0, failed = 0;

  for (let offset = 0; offset < total; offset += 100) {
    const data = await queryProducts(site.id, offset, 100);
    const products = data.products || [];

    for (const p of products) {
      const currentPrice = p.priceData?.price;
      if (currentPrice === NEW_PRICE) { updated++; continue; } // already correct

      const ok = await updatePrice(site.id, p.id);
      if (ok) updated++;
      else failed++;

      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`  Batch ${Math.floor(offset/100)+1}: ${updated} updated, ${failed} failed`);
  }

  console.log(`Done: ${updated} updated, ${failed} failed`);
}

async function main() {
  const sites = SITE_ARG !== null ? [SITES[SITE_ARG]] : SITES;
  for (const site of sites) {
    await processSite(site);
  }
}

main().catch(console.error);
