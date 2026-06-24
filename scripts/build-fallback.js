#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function readJson(file) {
  return JSON.parse(readFileSync(resolve(root, file), 'utf-8'));
}

const payload = {
  items: readJson('data/items.fallback.json'),
  paths: readJson('data/paths.json'),
  unlocks: readJson('data/unlocks.json'),
  challenges: readJson('data/challenges.json'),
  transformations: readJson('data/transformations.json'),
  trinkets: readJson('data/trinkets.json'),
};

const out = `window.ISAAC_FALLBACK = ${JSON.stringify(payload, null, 2)};\n`;
writeFileSync(resolve(root, 'data/fallback.js'), out);
console.log('Generated data/fallback.js');

