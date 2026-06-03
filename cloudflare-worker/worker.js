/**
 * K4RTO Browser Proxy — strips iframe-blocking headers (X-Frame-Options,
 * Content-Security-Policy frame-ancestors) so the Safari app in the K4RTO
 * portfolio can embed third-party sites.
 *
 * Deploy:   wrangler deploy
 * Endpoint: https://<worker-name>.<account>.workers.dev/?url=<encoded target URL>
 *
 * Security notes:
 *  - SSRF protection: rejects requests to private / loopback / link-local hosts.
 *  - Scheme whitelist: only http: and https: targets allowed.
 *  - No credential forwarding: cookies / auth headers are NOT proxied — login state
 *    cannot transit. This is deliberate for safety.
 *  - Optional allowlist via env.ALLOWED_ORIGINS to restrict who can call this Worker.
 *
 * Limits (Cloudflare free tier):
 *  - 100,000 requests / day
 *  - 10 ms CPU time / request
 *  - 128 MB memory
 *  Plenty for a portfolio.
 */

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

// Headers we strip from upstream responses (case-insensitive — Cloudflare normalizes).
const STRIPPED_RESPONSE_HEADERS = [
  "x-frame-options",
  "content-security-policy",
  "content-security-policy-report-only",
  "cross-origin-opener-policy",
  "cross-origin-embedder-policy",
  // CORP blocks non-HTML subresource loads in Chrome 73+ when their origin
  // differs from the embedding document — strip so img/css/js pass through.
  "cross-origin-resource-policy",
  // Don't forward set-cookie — we don't want to leak third-party cookies
  // into the user's session cookie jar
  "set-cookie",
];

const MAX_REDIRECTS = 5;

// Headers we forward from the client to upstream
const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "user-agent",
  "range",
];

function corsHeaders(origin) {
  return {
    "access-control-allow-origin": origin || "*",
    "access-control-allow-methods": "GET, HEAD, OPTIONS",
    "access-control-allow-headers": "*",
    "access-control-max-age": "86400",
    "vary": "Origin",
  };
}

function jsonError(status, message, origin) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders(origin) },
  });
}

/** HTML error page — returned for errors the user is likely to see in an iframe.
 *  Plain JSON would render as raw text and obscure the actual failure. */
function htmlError(status, title, detail, origin) {
  const safeTitle = String(title).replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
  const safeDetail = String(detail).replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
  const body = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${safeTitle}</title>
<style>
  body { font: 14px/1.5 -apple-system, system-ui, sans-serif; padding: 48px 32px; background: #1c1c1e; color: #ddd; max-width: 520px; margin: 0 auto; }
  h1 { font-size: 18px; margin: 0 0 12px; color: #fff; }
  p { margin: 0 0 16px; color: #aaa; }
  code { background: #2a2a2c; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
  .status { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #ff3b30; color: white; font-weight: 600; font-size: 11px; margin-bottom: 16px; }
</style>
</head>
<body>
<div class="status">HTTP ${status}</div>
<h1>${safeTitle}</h1>
<p>${safeDetail}</p>
<p style="font-size:12px;color:#666">Proxied via K4RTO Browser Proxy</p>
</body>
</html>`;
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", ...corsHeaders(origin) },
  });
}

/** Reject hosts that should never be reachable from a public proxy. */
function isPrivateHost(hostname) {
  if (!hostname) return true;
  const h = hostname.toLowerCase();
  if (h === "localhost") return true;
  if (h.endsWith(".local") || h.endsWith(".internal")) return true;
  // IPv4 private / loopback / link-local
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  if (h === "0.0.0.0") return true;
  // IPv6 loopback
  if (h === "::1") return true;
  // IPv6 link-local fe80::/10
  if (h.startsWith("fe80:")) return true;
  // IPv6 unique-local fc00::/7 (covers fc00::–fdff::, including AWS IMDS fd00:ec2::254)
  if (h.startsWith("fc") || h.startsWith("fd")) return true;
  // Cloud provider metadata endpoints
  if (h === "metadata.google.internal" || h === "169.254.169.254") return true;
  if (h === "168.63.129.16") return true; // Azure Wire Server / IMDS
  return false;
}

/** Optional caller allowlist via env.ALLOWED_ORIGINS (comma-separated). */
function isOriginAllowed(origin, allowedList) {
  if (!allowedList || allowedList.trim() === "" || allowedList === "*") return true;
  if (!origin) return false;
  const allowed = allowedList.split(",").map(s => s.trim()).filter(Boolean);
  return allowed.includes(origin);
}

/** Extract the origin from a Referer header (e.g. "https://k4rto.com/foo" → "https://k4rto.com"). */
function originFromReferer(referer) {
  if (!referer) return "";
  try { return new URL(referer).origin; } catch { return ""; }
}

/** Inject a <base> tag so relative URLs in HTML resolve to the target's origin,
 *  not to our worker domain. */
function injectBaseTag(html, targetUrl) {
  const base = `<base href="${targetUrl.origin}${targetUrl.pathname.replace(/\/[^/]*$/, "/")}">`;
  // Strip subresource integrity since we may modify the response and SRI would fail.
  const stripped = html.replace(/\sintegrity="[^"]*"/g, "");
  // Try to inject right after <head>; fall back to prepending.
  if (/<head[^>]*>/i.test(stripped)) {
    return stripped.replace(/<head[^>]*>/i, m => `${m}\n${base}\n`);
  }
  return `${base}\n${stripped}`;
}

export default {
  /**
   * @param {Request} request
   * @param {{ ALLOWED_ORIGINS?: string }} env
   */
  async fetch(request, env) {
    // Browsers omit the `Origin` header for plain navigation requests (including
    // iframe `src=` navigations). They DO send `Referer` though. For navigation
    // contexts, fall back to the Referer's origin so the allowlist still works.
    const headerOrigin = request.headers.get("origin") || "";
    const refererOrigin = originFromReferer(request.headers.get("referer"));
    const requestOrigin = headerOrigin || refererOrigin;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(headerOrigin) });
    }

    // Optional caller allowlist — try Origin header first, fall back to Referer.
    if (!isOriginAllowed(requestOrigin, env.ALLOWED_ORIGINS)) {
      return jsonError(403, "Origin not allowed", headerOrigin);
    }

    // Only GET / HEAD are supported (no body smuggling)
    if (request.method !== "GET" && request.method !== "HEAD") {
      return jsonError(405, "Method not allowed", requestOrigin);
    }

    const url = new URL(request.url);
    const target = url.searchParams.get("url");
    if (!target) {
      return jsonError(400, "Missing ?url= parameter", requestOrigin);
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return jsonError(400, "Invalid target URL", requestOrigin);
    }

    if (!ALLOWED_SCHEMES.has(targetUrl.protocol)) {
      return jsonError(400, "Scheme not allowed (only http: / https:)", requestOrigin);
    }
    if (isPrivateHost(targetUrl.hostname)) {
      return jsonError(403, "Private / loopback addresses are blocked (SSRF protection)", requestOrigin);
    }

    // Build the upstream request
    const upstreamHeaders = new Headers();
    for (const h of FORWARDED_REQUEST_HEADERS) {
      const v = request.headers.get(h);
      if (v) upstreamHeaders.set(h, v);
    }
    // Set a stable Referer so the target sees a normal browsing referer (some sites
    // refuse if Referer is missing entirely).
    upstreamHeaders.set("referer", targetUrl.origin + "/");

    // Manual redirect handling — re-validate every Location to prevent SSRF via
    // redirect to private addresses (DNS rebinding mitigation).
    let upstream;
    let currentUrl = targetUrl.toString();
    let hops = 0;
    try {
      while (true) {
        const r = await fetch(currentUrl, {
          method: request.method,
          headers: upstreamHeaders,
          redirect: "manual",
        });
        if (r.status >= 300 && r.status < 400 && r.status !== 304) {
          if (++hops > MAX_REDIRECTS) {
            return htmlError(508, "Too many redirects", `The page redirected more than ${MAX_REDIRECTS} times.`, requestOrigin);
          }
          const loc = r.headers.get("location");
          if (!loc) { upstream = r; break; }
          let nextUrl;
          try { nextUrl = new URL(loc, currentUrl); }
          catch { return htmlError(502, "Invalid redirect location", `The server returned a malformed Location header: ${loc}`, requestOrigin); }
          if (!ALLOWED_SCHEMES.has(nextUrl.protocol)) {
            return htmlError(403, "Redirect to disallowed scheme blocked", `The server tried to redirect to ${nextUrl.protocol} which is not allowed.`, requestOrigin);
          }
          if (isPrivateHost(nextUrl.hostname)) {
            return htmlError(403, "Redirect to private address blocked", `The server tried to redirect to ${nextUrl.hostname} (SSRF protection).`, requestOrigin);
          }
          // Update referer for the next hop
          upstreamHeaders.set("referer", nextUrl.origin + "/");
          currentUrl = nextUrl.toString();
          continue;
        }
        upstream = r;
        break;
      }
    } catch (e) {
      return htmlError(502, "Upstream fetch failed", `Could not reach the target site: ${e.message}`, requestOrigin);
    }

    // Update targetUrl reference for base-tag injection to reflect the final resolved URL
    try { targetUrl = new URL(currentUrl); } catch { /* keep original */ }

    // Build response headers — copy upstream, strip blocking headers, add CORS
    const respHeaders = new Headers();
    for (const [k, v] of upstream.headers.entries()) {
      if (STRIPPED_RESPONSE_HEADERS.includes(k.toLowerCase())) continue;
      respHeaders.set(k, v);
    }
    const cors = corsHeaders(requestOrigin);
    for (const [k, v] of Object.entries(cors)) {
      respHeaders.set(k, v);
    }
    // Annotate so downstream can confirm it went through the proxy
    respHeaders.set("x-proxied-by", "k4rto-browser-proxy");

    const contentType = upstream.headers.get("content-type") || "";

    // HTML responses: inject <base> so relative URLs (img/css/js) load directly from
    // the original origin instead of trying to load from the worker domain.
    if (contentType.toLowerCase().includes("text/html")) {
      let html;
      try {
        html = await upstream.text();
      } catch (e) {
        return htmlError(502, "Failed to read response body", e.message, requestOrigin);
      }
      const rewritten = injectBaseTag(html, targetUrl);
      // Set content-length to the new byte length so the iframe parses correctly
      respHeaders.delete("content-length");
      respHeaders.delete("content-encoding"); // upstream may have been gzipped; we send plain
      return new Response(rewritten, { status: upstream.status, headers: respHeaders });
    }

    // Non-HTML (images, JS, CSS, JSON): pass body through unchanged
    return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
  },
};
