// `images.unoptimized: true` (required for static export) makes next/image skip
// the loader that normally prepends basePath, so root-relative /public paths need
// it added manually here.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}
