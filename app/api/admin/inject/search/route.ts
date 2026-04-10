import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ store: null });
  }

  const { data, error } = await supabase
    .from('stores')
    .select('id, name, primary_color, secondary_color, owner_email')
    .ilike('owner_email', email)
    .limit(1);

  if (error) {
    return NextResponse.json({ store: null }, { status: 500 });
  }

  return NextResponse.json({ store: data?.[0] ?? null });
}
