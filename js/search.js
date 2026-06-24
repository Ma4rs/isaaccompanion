(function () {
  'use strict';

  const SYNONYMS = {
    auge: ['eye', 'augen'],
    eye: ['auge', 'augen'],
    fliege: ['fly', 'flies'],
    fly: ['fliege', 'flies'],
    feuer: ['fire', 'burn'],
    fire: ['feuer', 'burn'],
    blut: ['blood'],
    blood: ['blut'],
    bombe: ['bomb', 'explosive', 'explosion'],
    bomb: ['bombe', 'explosive', 'explosion'],
    herz: ['heart', 'hearts', 'hp'],
    heart: ['herz', 'hearts', 'hp'],
    pille: ['pill', 'pills'],
    pill: ['pille', 'pills'],
    spinne: ['spider', 'spiders'],
    spider: ['spinne', 'spiders'],
    flug: ['flight', 'flying'],
    flight: ['flug', 'flying'],
    tears: ['tear', 'tears'],
    dmg: ['damage'],
    hp: ['health', 'heart'],
    traene: ['tears', 'tear'],
    tearsup: ['tears up'],
    dmgup: ['dmg up', 'damage up'],
  };
  const STOP_WORDS = new Set(['the', 'of', 'and', 'item', 'items', 'mit', 'und', 'der', 'die', 'das']);

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function tokenize(value) {
    return normalize(value).split(/[^a-z0-9+]+/).filter(Boolean);
  }

  function dedupeTerms(terms) {
    const out = [];
    const seen = new Set();
    terms.forEach((term) => {
      if (!term || seen.has(term)) return;
      seen.add(term);
      out.push(term);
    });
    return out;
  }

  function expandTokens(input) {
    const source = tokenize(input);
    const out = new Set(source);
    source.forEach((token) => {
      const syn = SYNONYMS[token];
      if (syn) syn.forEach((s) => out.add(normalize(s)));
    });
    return dedupeTerms([...out]);
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j += 1) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[a.length][b.length];
  }

  function typoMatch(needle, hayTokens) {
    if (needle.length < 4) return false;
    const maxDistance = needle.length > 6 ? 2 : 1;
    return hayTokens.some((token) => Math.abs(token.length - needle.length) <= maxDistance && levenshtein(needle, token) <= maxDistance);
  }

  function scoreEntity(entity, query, opts) {
    const q = normalize(query).trim();
    if (q.length < 2) return 0;

    const name = normalize(opts.name(entity) || '');
    const desc = normalize(opts.description(entity) || '');
    const tags = (opts.tags(entity) || []).map((tag) => normalize(tag));
    const tagSet = new Set(tags);
    const terms = expandTokens(q).filter((term) => !STOP_WORDS.has(term));
    const queryTokens = tokenize(q).filter((term) => !STOP_WORDS.has(term));
    const queryWithoutStopWords = queryTokens.join(' ').trim();
    const nameTokens = tokenize(name);
    const descTokens = tokenize(desc);
    const tagTokens = tags.flatMap((tag) => tokenize(tag));

    let score = 0;
    if (queryWithoutStopWords && name === queryWithoutStopWords) score = Math.max(score, 140);
    else if (queryWithoutStopWords && name.includes(queryWithoutStopWords)) score = Math.max(score, 110);

    for (const term of terms) {
      if (name === term) score = Math.max(score, 130);
      else if (name.startsWith(term)) score = Math.max(score, 108);
      else if (name.includes(term)) score = Math.max(score, 92);
      else if (tagSet.has(term)) score = Math.max(score, 75);
      else if (tags.some((tag) => tag.startsWith(term))) score = Math.max(score, 70);
      else if (tags.some((tag) => tag.includes(term))) score = Math.max(score, 65);
      else if (desc.includes(term)) score = Math.max(score, 45);
    }

    if (queryTokens.length >= 2) {
      const allTermsMatch = queryTokens.every((term) =>
        nameTokens.includes(term) || descTokens.includes(term) || tagTokens.includes(term) || name.includes(term)
      );
      if (allTermsMatch) score += 18;
    }

    if (!score) {
      if (terms.some((term) => typoMatch(term, nameTokens))) score = 35;
      else if (terms.some((term) => typoMatch(term, tagTokens))) score = 28;
    }

    return score;
  }

  function rankEntities(list, query, opts) {
    return list
      .map((entity) => ({ entity, score: scoreEntity(entity, query, opts) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return String(opts.name(a.entity) || '').localeCompare(String(opts.name(b.entity) || ''));
      })
      .map((row) => row.entity);
  }

  window.IsaacSearch = {
    normalize,
    tokenize,
    expandTokens,
    rankEntities,
  };
})();

