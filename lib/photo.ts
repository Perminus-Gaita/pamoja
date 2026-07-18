/*
 * Client-safe helpers for stored photo URLs. New uploads store two derivatives
 * (…-display.webp for lightbox/detail, …-thumb.webp for grids and avatars);
 * the display URL is what lands in the DB. Legacy URLs (/api/images/<folder>/…)
 * have a single file and pass through unchanged, so old data keeps rendering.
 */
export function photoThumb(url?: string | null): string {
  if (!url) return ''
  return url.endsWith('-display.webp')
    ? url.slice(0, -'-display.webp'.length) + '-thumb.webp'
    : url
}
