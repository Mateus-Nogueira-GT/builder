import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const color = searchParams.get("color");

  let query = supabase
    .from("banner_catalog")
    .select("*")
    .order("created_at", { ascending: false });

  if (color) {
    query = query.eq("color", color);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    (data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      color: item.color,
      style: item.style,
      desktopUrl: item.desktop_url,
      mobileUrl: item.mobile_url,
      thumbnailUrl: item.thumbnail_url || item.desktop_url,
      primaryColor: item.primary_color,
      tags: item.tags,
      createdAt: item.created_at,
    }))
  );
}

export async function POST(request: Request) {
  const token = await getToken({
    req: request as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token?.role !== "super_admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const color = formData.get("color") as string;
    const style = formData.get("style") as string;
    const primaryColor = formData.get("primaryColor") as string;
    const tagsRaw = formData.get("tags") as string;
    const desktop = formData.get("desktop") as File;
    const mobile = formData.get("mobile") as File;

    if (!desktop || !mobile || !name) {
      return NextResponse.json(
        { error: "Nome, arquivo desktop e mobile são obrigatórios" },
        { status: 400 }
      );
    }

    // Upload desktop
    const desktopPath = `banners/${Date.now()}-desktop-${desktop.name}`;
    const { error: uploadDesktopErr } = await supabase.storage
      .from("assets")
      .upload(desktopPath, desktop, { contentType: desktop.type });

    if (uploadDesktopErr) throw uploadDesktopErr;

    // Upload mobile
    const mobilePath = `banners/${Date.now()}-mobile-${mobile.name}`;
    const { error: uploadMobileErr } = await supabase.storage
      .from("assets")
      .upload(mobilePath, mobile, { contentType: mobile.type });

    if (uploadMobileErr) throw uploadMobileErr;

    const { data: desktopUrlData } = supabase.storage.from("assets").getPublicUrl(desktopPath);
    const { data: mobileUrlData } = supabase.storage.from("assets").getPublicUrl(mobilePath);

    const tags = tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const { data, error: insertError } = await supabase
      .from("banner_catalog")
      .insert({
        name,
        color,
        style,
        primary_color: primaryColor,
        tags,
        desktop_url: desktopUrlData.publicUrl,
        mobile_url: mobileUrlData.publicUrl,
        thumbnail_url: desktopUrlData.publicUrl,
      })
      .select("*")
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao cadastrar banner" },
      { status: 500 }
    );
  }
}
