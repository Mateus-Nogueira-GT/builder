/**
 * Returns the public-facing base URL (e.g. https://wix.winhub.com.br).
 *
 * Priority:
 * 1. NEXTAUTH_URL env var — but only if it's NOT localhost (avoids
 *    the common mistake of deploying with NEXTAUTH_URL=http://localhost:3000).
 * 2. x-forwarded-host header (set by Vercel / reverse proxies).
 * 3. host header.
 * 4. Fallback to request.url origin.
 */
export function getPublicBaseUrl(request: Request): string {
  const nextauthUrl = process.env.NEXTAUTH_URL;
  if (nextauthUrl && !nextauthUrl.includes("localhost")) {
    return nextauthUrl.replace(/\/$/, "");
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const proto = request.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${forwardedHost}`;
  }

  const host = request.headers.get("host");
  if (host) {
    const proto = host.includes("localhost") ? "http" : "https";
    return `${proto}://${host}`;
  }

  return new URL(request.url).origin;
}
