import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getPublicBaseUrl } from "@/lib/url";

// Wix OAuth — Step 1: Generate authorization URL (external install flow)
// Docs: https://dev.wix.com/docs/build-apps/launch-your-app/app-distribution/set-up-the-external-install-flow
export async function GET(request: Request) {
  const token = await getToken({
    req: request as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const appId = process.env.WIX_OAUTH_APP_ID!;
  const baseUrl = getPublicBaseUrl(request);

  // storeId is required — by the time OAuth starts, the store already exists in the DB
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") || "";

  if (!storeId) {
    return NextResponse.json({ error: "storeId é obrigatório" }, { status: 400 });
  }

  // Embed state directly in the callback URL so Wix doesn't need to echo it back.
  // Pattern from external install flow: state is ours, not Wix's.
  const callbackUrl = new URL(`${baseUrl}/api/wix/oauth/callback`);
  callbackUrl.searchParams.set("state", `${token.id}|${storeId}`);

  const authUrl = `https://www.wix.com/app-installer?appId=${appId}&postInstallationUrl=${encodeURIComponent(callbackUrl.toString())}`;

  console.log("[WIX OAuth] appId:", appId, "| storeId:", storeId, "| callbackUrl:", callbackUrl.toString());

  return NextResponse.json({ authUrl });
}
