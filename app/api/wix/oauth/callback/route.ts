import { NextResponse } from "next/server";

/**
 * Wix OAuth callback — captures instanceId after app installation.
 * The user is redirected here after installing the app on their Wix site.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const instanceId = url.searchParams.get("instanceId");
  const state = url.searchParams.get("state");

  // Log everything for debugging
  console.log("[Wix OAuth Callback]", {
    code,
    instanceId,
    state,
    allParams: Object.fromEntries(url.searchParams.entries()),
  });

  // For now, just display the instanceId so we can capture it
  return new NextResponse(
    `<html>
      <body style="font-family:monospace;padding:40px;background:#18181b;color:#fff">
        <h2>Wix OAuth Callback</h2>
        <p><strong>instanceId:</strong> ${instanceId || "não recebido"}</p>
        <p><strong>code:</strong> ${code || "não recebido"}</p>
        <p><strong>state:</strong> ${state || "não recebido"}</p>
        <p><strong>Todos os params:</strong> ${JSON.stringify(Object.fromEntries(url.searchParams.entries()), null, 2)}</p>
      </body>
    </html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
