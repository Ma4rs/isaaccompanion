#!/usr/bin/env node

// Tag rules use whole-word / phrase matching (with word boundaries) to avoid
// false positives such as "fire" matching "tears fired per second" or
// "fly" matching "flying over gaps".
//
// `phrases` are matched as whole words/phrases (word boundaries on both sides).
// Bilingual thematic tags (e.g. auge/eye) are intentionally kept so users can
// search in German or English, matching the search synonym table.
export const TAG_RULES = [
  { tag: 'tears up', phrases: ['tears up', 'tear rate up', 'fire rate up', 'tears upgrade'] },
  { tag: 'tears down', phrases: ['tears down'] },
  { tag: 'dmg up', phrases: ['damage up', 'dmg up', 'damage multiplier'] },
  { tag: 'hp up', phrases: ['hp up', 'health up', 'heart container', 'heart containers', 'full heal', 'extra life'] },
  { tag: 'speed up', phrases: ['speed up'] },
  { tag: 'range up', phrases: ['range up'] },
  { tag: 'shot speed', phrases: ['shot speed'] },
  { tag: 'luck', phrases: ['luck up', 'luck down'] },
  { tag: 'flight', phrases: ['flight', 'fly over', 'fly over gaps', 'flies over'] },
  { tag: 'homing', phrases: ['homing'] },
  { tag: 'piercing', phrases: ['piercing', 'pierces', 'pierce'] },
  { tag: 'spectral', phrases: ['spectral'] },
  { tag: 'familiar', phrases: ['familiar', 'familiars'] },
  { tag: 'orbital', phrases: ['orbital', 'orbitals'] },
  { tag: 'auge', phrases: ['eye', 'eyes'] },
  { tag: 'eye', phrases: ['eye', 'eyes'] },
  { tag: 'fliege', phrases: ['blue fly', 'blue flies', 'fly familiar', 'spawns a fly', 'spawns flies'] },
  { tag: 'fly', phrases: ['blue fly', 'blue flies', 'fly familiar', 'spawns a fly', 'spawns flies'] },
  { tag: 'feuer', phrases: ['burning', 'on fire', 'flame', 'flames', 'ignite', 'burns enemies', 'fire damage'] },
  { tag: 'fire', phrases: ['burning', 'on fire', 'flame', 'flames', 'ignite', 'burns enemies', 'fire damage'] },
  { tag: 'blut', phrases: ['blood'] },
  { tag: 'blood', phrases: ['blood'] },
  { tag: 'bombe', phrases: ['bomb', 'bombs', 'explosion', 'explosive', 'explodes'] },
  { tag: 'bomb', phrases: ['bomb', 'bombs', 'explosion', 'explosive', 'explodes'] },
  { tag: 'herz', phrases: ['heart', 'hearts'] },
  { tag: 'heart', phrases: ['heart', 'hearts'] },
  { tag: 'pille', phrases: ['pill', 'pills'] },
  { tag: 'pill', phrases: ['pill', 'pills'] },
  { tag: 'spinne', phrases: ['spider', 'spiders'] },
  { tag: 'spider', phrases: ['spider', 'spiders'] },
  { tag: 'poison', phrases: ['poison', 'poisons', 'venom'] },
  { tag: 'freeze', phrases: ['freeze', 'frozen', 'freezes'] },
  { tag: 'laser', phrases: ['laser', 'lasers', 'brimstone'] },
  { tag: 'shield', phrases: ['shield', 'invincible', 'invincibility'] },
];

export function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function toPool(poolLine) {
  const value = normalizeText(poolLine);
  if (value.includes('devil')) return 'devil';
  if (value.includes('angel')) return 'angel';
  if (value.includes('shop')) return 'shop';
  if (value.includes('boss')) return 'boss';
  if (value.includes('secret')) return 'secret';
  if (value.includes('golden chest')) return 'golden';
  if (value.includes('planetarium')) return 'planetarium';
  if (value.includes('crane')) return 'crane';
  if (value.includes('curse')) return 'curse';
  if (value.includes('library')) return 'library';
  return 'treasure';
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Build one combined regex per tag matching whole words/phrases only.
// Spaces become flexible whitespace, and matches require non-alphanumeric
// boundaries so "fire" never matches "fired" and "heart" never matches "hearth".
function buildMatcher(phrases) {
  const parts = phrases.map((p) => escapeRegExp(p).replace(/\s+/g, '\\s+'));
  return new RegExp('(?:^|[^a-z0-9])(?:' + parts.join('|') + ')(?![a-z0-9])', 'i');
}

const COMPILED_RULES = TAG_RULES.map((r) => ({ tag: r.tag, re: buildMatcher(r.phrases) }));

export function deriveTags(entity) {
  const tags = new Set(Array.isArray(entity.tags) ? entity.tags : []);
  const blob = normalizeText(
    [entity.name, entity.description, entity.quote].filter(Boolean).join(' \u2022 ')
  );
  for (const rule of COMPILED_RULES) {
    if (rule.re.test(blob)) tags.add(rule.tag);
  }
  if (entity.pool) tags.add(normalizeText(entity.pool));
  return [...tags].sort();
}
