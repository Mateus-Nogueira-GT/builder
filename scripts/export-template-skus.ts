import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";

const envText = readFileSync(".env.local", "utf-8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const ext = createClient(
  process.env.EXTERNAL_SUPABASE_URL!,
  process.env.EXTERNAL_SUPABASE_KEY!
);

async function main() {
  const all: Array<{ sku: string; gender: string }> = [];
  let offset = 0;
  while (true) {
    const { data, error } = await ext
      .from("wix_template_skus")
      .select("sku, gender")
      .order("sku", { ascending: true })
      .range(offset, offset + 999);
    if (error) {
      console.error(error.message);
      break;
    }
    if (!data || data.length === 0) break;
    for (const row of data as Array<{ sku: string; gender: string }>) all.push(row);
    if (data.length < 1000) break;
    offset += 1000;
  }

  console.log(`Total SKUs exportados: ${all.length}`);
  console.log(`Por gender:`);
  const byGender = all.reduce<Record<string, number>>((acc, r) => {
    acc[r.gender ?? "null"] = (acc[r.gender ?? "null"] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`  ${JSON.stringify(byGender)}`);

  // CSV simples
  const csv = ["sku,gender", ...all.map((r) => `${r.sku},${r.gender ?? ""}`)].join("\n");
  writeFileSync("wix_template_skus.csv", csv);
  console.log(`Arquivo: wix_template_skus.csv (${csv.length} bytes)`);

  // Lista pra clipboard fácil
  console.log(`\nPrimeiros 10 SKUs:`);
  for (const r of all.slice(0, 10)) console.log(`  ${r.sku} (${r.gender})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
