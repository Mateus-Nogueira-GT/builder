import { NextResponse } from "next/server";

/**
 * Returns Wix configuration status.
 * No longer exposes API keys — auth is handled server-side via OAuth.
 */
export async function GET() {
  const clientId = process.env.WIX_OAUTH_APP_ID;
  const hasSecret = !!process.env.WIX_OAUTH_APP_SECRET;
  const hasAdminKey = !!process.env.WIX_ADMIN_API_KEY;

  return NextResponse.json({
    clientId,
    configured: !!(clientId && hasSecret && hasAdminKey),
  });
}
