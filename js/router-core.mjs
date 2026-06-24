export function parseRoute(hashValue) {
  const hash = (hashValue || '#/').slice(1);
  const parts = hash.split('/').filter(Boolean);
  const rawId = parts[1] || null;
  let decodedId = null;
  if (rawId !== null) {
    try { decodedId = decodeURIComponent(rawId); }
    catch { decodedId = rawId; }
  }
  return { path: parts[0] || '', id: decodedId };
}
