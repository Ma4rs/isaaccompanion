import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute } from '../js/router-core.mjs';

test('parseRoute decodes route id correctly', () => {
  const route = parseRoute('#/items/The%20Wafer');
  assert.equal(route.path, 'items');
  assert.equal(route.id, 'The Wafer');
});

test('parseRoute defaults to home', () => {
  const route = parseRoute('#/');
  assert.equal(route.path, '');
  assert.equal(route.id, null);
});

