import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const MAX_VERSIONS_PER_STORE = 20;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId");

  if (!storeId) {
    return NextResponse.json({ error: "storeId is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("content_versions")
    .select("id, trigger, block_name, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(MAX_VERSIONS_PER_STORE);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, content, trigger, blockName } = body;

    if (!storeId || !content || !trigger) {
      return NextResponse.json(
        { error: "storeId, content, and trigger are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("content_versions")
      .insert({
        store_id: storeId,
        content,
        trigger,
        block_name: blockName || null,
      })
      .select("id, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Cleanup: delete excess versions beyond MAX_VERSIONS_PER_STORE
    const { data: allVersions } = await supabase
      .from("content_versions")
      .select("id")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (allVersions && allVersions.length > MAX_VERSIONS_PER_STORE) {
      const idsToDelete = allVersions
        .slice(MAX_VERSIONS_PER_STORE)
        .map((v) => v.id);

      await supabase
        .from("content_versions")
        .delete()
        .in("id", idsToDelete);
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao salvar versão" },
      { status: 500 }
    );
  }
}
