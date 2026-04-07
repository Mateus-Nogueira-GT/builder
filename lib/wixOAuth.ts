/**
 * Wix OAuth Client Credentials Token Manager
 *
 * Fetches and caches access tokens per instanceId.
 * Tokens are valid for 4 hours; we refresh at 3.5h to avoid edge-case expiry.
 *
 * Docs: https://dev.wix.com/docs/build-apps/develop-your-app/access/authentication/authenticate-using-oauth
 */

const WIX_OAUTH_URL = "https://www.wixapis.com/oauth2/token";

const CLIENT_ID = process.env.WIX_CLIENT_ID!;
const CLIENT_SECRET = process.env.WIX_CLIENT_SECRET!;

interface CachedToken {
  accessToken: string;
  expiresAt: number; // Date.now() + TTL
}

// In-memory cache keyed by instanceId
const tokenCache = new Map<string, CachedToken>();

// Refresh 30 min before actual expiry (4h = 14400s, refresh at 3.5h = 12600s)
const TOKEN_TTL_MS = 12_600_000;

/**
 * Returns a valid OAuth access token for the given instanceId.
 * Fetches a new token if none is cached or the cached one is near expiry.
 */
export async function getOAuthToken(instanceId: string): Promise<string> {
  const cached = tokenCache.get(instanceId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.accessToken;
  }

  const res = await fetch(WIX_OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      instance_id: instanceId,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Wix OAuth token request failed (${res.status}): ${errText}`
    );
  }

  const data = await res.json();
  const accessToken: string = data.access_token;

  if (!accessToken) {
    throw new Error("Wix OAuth response missing access_token");
  }

  tokenCache.set(instanceId, {
    accessToken,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });

  return accessToken;
}

/**
 * Removes a cached token (e.g. on auth errors to force re-fetch).
 */
export function invalidateToken(instanceId: string): void {
  tokenCache.delete(instanceId);
}

/**
 * Installs our Wix app on a site and returns the instanceId.
 * Uses the admin API key (account-level operation).
 * Falls back to the metaSiteId if installation doesn't return an instanceId.
 */
export async function installAppOnSite(
  metaSiteId: string
): Promise<string> {
  const adminApiKey = process.env.WIX_ADMIN_API_KEY!;
  const accountId = process.env.WIX_ACCOUNT_ID!;

  // Try bulk-install endpoint
  const res = await fetch(
    "https://www.wixapis.com/apps/v1/bulk-install",
    {
      method: "POST",
      headers: {
        Authorization: adminApiKey,
        "wix-account-id": accountId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        metaSiteIds: [metaSiteId],
        appId: CLIENT_ID,
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.warn(`App install returned ${res.status}: ${errText}. Using metaSiteId as instanceId fallback.`);
    return metaSiteId;
  }

  const data = await res.json();

  // Extract instanceId from response if available
  const instanceId =
    data?.installationResults?.[0]?.instanceId ??
    data?.instanceId ??
    metaSiteId;

  return instanceId;
}
