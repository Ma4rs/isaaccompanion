import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreSimple } from '../js/search-core.mjs';

test('search prefers exact tag matches over description', () => {
  const byTag = { name: 'Spoon Bender', description: 'Homing tears', tags: ['eye', 'homing'] };
  const byDesc = { name: 'Unknown', description: 'An item with eye motif', tags: [] };
  assert.ok(scoreSimple(byTag, 'auge') > scoreSimple(byDesc, 'auge'));
});

test('search handles thematic german queries', () => {
  const item = { name: 'Halo of Flies', description: 'Fly orbitals', tags: ['fliege', 'fly'] };
  assert.ok(scoreSimple(item, 'fliege') > 0);
  assert.ok(scoreSimple(item, 'fly') > 0);
});

test('search rewards multi-word name phrase matches', () => {
  const phrase = { name: 'Blood of the Martyr', description: 'Damage up', tags: ['blood', 'dmg up'] };
  const other = { name: 'Martyr Tears', description: 'Some effect', tags: [] };
  assert.ok(scoreSimple(phrase, 'blood martyr') > scoreSimple(other, 'blood martyr'));
});

test('search tolerates small typos', () => {
  const item = { name: 'Brimstone', description: 'Blood laser', tags: ['blood', 'fire'] };
  assert.ok(scoreSimple(item, 'brimstne') > 0);
});

