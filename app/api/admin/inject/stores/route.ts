import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('stores')
    .select('id, name, owner_email, wix_site_id, wix_api_key, wix_site_url, primary_color')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ stores: [] }, { status: 500 });
  }

  return NextResponse.json({ stores: data ?? [] });
}
