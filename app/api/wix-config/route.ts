import { NextResponse } from "next/server";

/**
 * Retorna a configuração Wix do servidor (API Key + Site ID).
 * O usuário não precisa inserir manualmente.
 */
export async function GET() {
  const apiKey = process.env.WIX_ADMIN_API_KEY;
  const clientId = process.env.WIX_CLIENT_ID;

  if (!apiKey) {
    return NextResponse.json(
      { error: "WIX_ADMIN_API_KEY não configurada no servidor" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    apiKey,
    clientId,
    configured: true,
  });
}
