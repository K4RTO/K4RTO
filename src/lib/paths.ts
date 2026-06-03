/**
 * Static asset path utilities for GitHub Pages compatibility.
 *
 * Next.js's `basePath` only auto-prefixes paths used by `next/link`, `next/image`,
 * and `next/router`. Anything using a raw `<a href>`, `fetch()`, or third-party
 * libs (react-pdf's `file=`, etc.) needs to manually prepend the basePath.
 *
 * Usage:
 *   <a href={withBase("/K4RTO/Resume.pdf")}>...</a>
 *   <Document file={withBase("/K4RTO/Resume.pdf")} />
 *
 * To enable basePath at build time:
 *   1. Set NEXT_PUBLIC_BASE_PATH=/profile in .env (or shell env)
 *   2. Uncomment `basePath: "/profile"` in next.config.ts so Next's own routing matches
 */

export const BASE_PATH: string = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Prepend BASE_PATH to an absolute path. Leaves non-absolute paths and URLs untouched.
 *
 * @example withBase("/K4RTO/Resume.pdf")     // → "/profile/K4RTO/Resume.pdf" (under basePath)
 * @example withBase("https://...")           // → unchanged
 * @example withBase("relative/path")         // → unchanged
 */
export function withBase(path: string): string {
  if (!path) return path;
  if (!path.startsWith("/")) return path;       // relative path — caller's responsibility
  if (path.startsWith("//")) return path;       // protocol-relative URL
  return `${BASE_PATH}${path}`;
}
