#!/usr/bin/env node

export const TAG_RULES = [
  { tag: 'tears up', words: ['tears up', 'tear rate', 'fire rate'] },
  { tag: 'dmg up', words: ['damage up', 'dmg up', 'damage multiplier'] },
  { tag: 'hp up', words: ['hp up', 'health up', 'heart container', 'full heal'] },
  { tag: 'speed up', words: ['speed up'] },
  { tag: 'range up', words: ['range up'] },
  { tag: 'shot speed', words: ['shot speed'] },
  { tag: 'luck', words: ['luck up', 'luck down', 'luck'] },
  { tag: 'flight', words: ['flight', 'fly over', 'flying'] },
  { tag: 'homing', words: ['homing'] },
  { tag: 'piercing', words: ['piercing'] },
  { tag: 'spectral', words: ['spectral'] },
  { tag: 'familiar', words: ['familiar'] },
  { tag: 'orbital', words: ['orbital'] },
  { tag: 'auge', words: ['eye', 'eyes'] },
  { tag: 'eye', words: ['eye', 'eyes'] },
  { tag: 'fliege', words: ['fly', 'flies'] },
  { tag: 'fly', words: ['fly', 'flies'] },
  { tag: 'feuer', words: ['fire', 'burn'] },
  { tag: 'fire', words: ['fire', 'burn'] },
  { tag: 'blut', words: ['blood'] },
  { tag: 'blood', words: ['blood'] },
  { tag: 'bombe', words: ['bomb', 'explosion', 'explosive'] },
  { tag: 'bomb', words: ['bomb', 'explosion', 'explosive'] },
  { tag: 'herz', words: ['heart', 'hearts'] },
  { tag: 'heart', words: ['heart', 'hearts'] },
  { tag: 'pille', words: ['pill', 'pills'] },
  { tag: 'pill', words: ['pill', 'pills'] },
  { tag: 'spinne', words: ['spider', 'spiders'] },
  { tag: 'spider', words: ['spider', 'spiders'] },
  { tag: 'devil', words: ['devil'] },
  { tag: 'angel', words: ['angel'] },
  { tag: 'secret', words: ['secret'] },
  { tag: 'boss', words: ['boss'] },
  { tag: 'shop', words: ['shop', 'store'] },
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
  return 'treasure';
}

export function deriveTags(entity) {
  const tags = new Set(Array.isArray(entity.tags) ? entity.tags : []);
  const blob = normalizeText([entity.name, entity.description, entity.quote, entity.pool].filter(Boolean).join(' '));
  for (const rule of TAG_RULES) {
    if (rule.words.some((word) => blob.includes(normalizeText(word)))) {
      tags.add(rule.tag);
    }
  }
  if (entity.pool) tags.add(normalizeText(entity.pool));
  return [...tags].sort();
}

