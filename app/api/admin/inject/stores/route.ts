import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('stores')
    .select('id, name, owner_email, phone, wix_site_id, wix_api_key, wix_site_url, primary_color')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ stores: [] }, { status: 500 });
  }

  // Buscar senhas dos usuários pelo email
  const storeRows = (data ?? []) as { id: string; name: string; owner_email: string | null; phone: string | null; wix_site_id: string | null; wix_api_key: string | null; wix_site_url: string | null; primary_color: string | null }[];
  const emails = storeRows.map((s) => s.owner_email).filter(Boolean) as string[];
  const { data: users } = emails.length
    ? await supabase.from('users').select('email, password_hash').in('email', emails)
    : { data: [] };

  const passwordMap = new Map((users ?? []).map((u: { email: string; password_hash: string }) => [u.email, u.password_hash]));

  const stores = storeRows.map((s) => ({
    ...s,
    password: s.owner_email ? passwordMap.get(s.owner_email) ?? null : null,
  }));

  return NextResponse.json({ stores });
}
