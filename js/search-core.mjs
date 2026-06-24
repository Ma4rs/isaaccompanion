const SYNONYMS = {
  auge: ['eye'],
  eye: ['auge'],
  fliege: ['fly'],
  fly: ['fliege'],
  feuer: ['fire'],
  fire: ['feuer'],
  bombe: ['bomb'],
  bomb: ['bombe'],
};

export function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function expandTokens(input) {
  const base = normalize(input).split(/[^a-z0-9+]+/).filter(Boolean);
  const out = new Set(base);
  base.forEach((token) => {
    const syn = SYNONYMS[token];
    if (syn) syn.forEach((item) => out.add(normalize(item)));
  });
  return [...out];
}

export function scoreSimple(entity, query) {
  const terms = expandTokens(query);
  const name = normalize(entity.name);
  const desc = normalize(entity.description);
  const tags = (entity.tags || []).map((tag) => normalize(tag));
  const set = new Set(tags);
  const fullQuery = normalize(query).trim();
  const queryTokens = fullQuery.split(/[^a-z0-9+]+/).filter(Boolean);
  let score = 0;
  if (fullQuery && name.includes(fullQuery)) score = Math.max(score, 100);
  for (const term of terms) {
    if (name === term) score = Math.max(score, 120);
    else if (name.includes(term)) score = Math.max(score, 90);
    else if (set.has(term)) score = Math.max(score, 75);
    else if (desc.includes(term)) score = Math.max(score, 45);
  }
  if (queryTokens.length >= 2 && queryTokens.every((token) => name.includes(token))) score += 20;
  if (!score && terms.some((term) => term.length > 4 && name.split(/[^a-z0-9+]+/).some((token) => Math.abs(token.length - term.length) <= 1))) {
    score = 25;
  }
  return score;
}
