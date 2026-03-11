/**
 * Returns the correct public URL for an attachment storageKey.
 *
 * - New uploads (Vercel Blob): storageKey is a full https:// URL → use as-is
 * - Old uploads (local fs):    storageKey is a relative path  → proxy via /api/uploads
 */
export function getAttachmentUrl(storageKey: string): string {
  if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
    return storageKey
  }
  return `/api/uploads/${storageKey}`
}
