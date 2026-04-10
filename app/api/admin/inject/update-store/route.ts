import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { storeId, wixSiteId, wixApiKey, wixSiteUrl } = await request.json();

    if (!storeId) {
      return NextResponse.json({ error: 'storeId é obrigatório' }, { status: 400 });
    }

    const update: Record<string, string> = {};
    if (wixSiteId) update.wix_site_id = wixSiteId;
    if (wixApiKey) update.wix_api_key = wixApiKey;
    if (wixSiteUrl) update.wix_site_url = wixSiteUrl;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const { error } = await supabase
      .from('stores')
      .update(update)
      .eq('id', storeId);

    if (error) {
      return NextResponse.json({ error: 'Erro ao atualizar loja.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erro inesperado.' }, { status: 500 });
  }
}
