import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 6 caracteres" }, { status: 400 });
    }

    // Check if email already exists
    const { data: existing } = await supabase.rpc("find_user_by_email", { p_email: email });

    if (existing) {
      return NextResponse.json({ error: "Este email já está cadastrado" }, { status: 409 });
    }

    // Create user via RPC (bypasses PostgREST cache)
    const { data: user, error } = await supabase.rpc("insert_user", {
      p_email: email,
      p_name: name || email.split("@")[0],
      p_password_hash: password,
      p_role: "user",
    });

    if (error) {
      return NextResponse.json({ error: "Erro ao criar conta: " + error.message }, { status: 500 });
    }

    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao criar conta" },
      { status: 500 }
    );
  }
}
