import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const token = await getToken({
    req: request as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_email", token.email)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const token = await getToken({
    req: request as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });

  console.log("[STORES POST] token:", JSON.stringify({ id: token?.id, email: token?.email }));
  console.log("[STORES POST] supabase url:", process.env.NEXT_PUBLIC_SUPABASE_URL);

  if (!token?.id) {
    console.log("[STORES POST] REJECTED: no token.id");
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json();
  console.log("[STORES POST] body:", JSON.stringify(body));

  const storeName = body.templateId
    ? `${body.name} | ${body.templateId}`
    : body.name;

  const insertPayload = {
    name: storeName,
    wix_site_id: "pending",
  };
  console.log("[STORES POST] inserting:", JSON.stringify(insertPayload));

  const { data, error } = await supabase.rpc("insert_store", {
    p_name: insertPayload.name,
    p_wix_site_id: insertPayload.wix_site_id,
    p_owner_email: token.email || null,
  });

  console.log("[STORES POST] result:", JSON.stringify({ data, error: error?.message, code: error?.code, details: error?.details }));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Salva o telefone se fornecido
  const phone = body.phone?.trim() || null;
  if (phone && data) {
    const storeId = Array.isArray(data) ? data[0]?.id : (data as { id?: string })?.id;
    if (storeId) {
      await supabase.from("stores").update({ phone }).eq("id", storeId);
    }
  }

  return NextResponse.json(data);
}
