import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getPublicBaseUrl } from "@/lib/url";

// Wix OAuth — Step 1: Generate authorization URL
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
  const redirectUri = `${baseUrl}/api/wix/oauth/callback`;

  console.log("[WIX OAuth] baseUrl:", baseUrl, "| redirectUri:", redirectUri, "| appId:", appId);

  // Store user ID and template choice in state param
  const { searchParams } = new URL(request.url);
  const storeName = searchParams.get("storeName") || "";
  const templateSiteId = searchParams.get("templateSiteId") || "";

  const state = Buffer.from(
    JSON.stringify({ userId: token.id, storeName, templateSiteId })
  ).toString("base64");

  const authUrl = new URL("https://www.wix.com/installer/install");
  authUrl.searchParams.set("appId", appId);
  authUrl.searchParams.set("redirectUrl", redirectUri);
  authUrl.searchParams.set("state", state);

  return NextResponse.json({ authUrl: authUrl.toString() });
}
