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
    .eq("owner_id", token.id)
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

  if (!token?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json();

  const { data, error } = await supabase
    .from("stores")
    .insert({
      owner_id: token.id,
      name: body.name,
      wix_api_key: body.apiKey,
      wix_site_id: body.siteId,
      wix_site_url: body.siteUrl || null,
      wix_instance_id: body.instanceId || null,
      owner_email: body.email || null,
      whatsapp: body.whatsapp || null,
      instagram: body.instagram || null,
      city: body.city || null,
      state: body.state || null,
      focus: body.focus || "todos",
      active_promotion: body.activePromotion || null,
      primary_color: body.primaryColor || "#10b981",
      secondary_color: body.secondaryColor || "#18181b",
      connection_method: body.connectionMethod || "api_key",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
