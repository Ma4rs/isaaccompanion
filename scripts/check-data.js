#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const items = JSON.parse(readFileSync(resolve(root, 'data/items.fallback.json'), 'utf-8'));
const trinkets = JSON.parse(readFileSync(resolve(root, 'data/trinkets.json'), 'utf-8'));
const paths = JSON.parse(readFileSync(resolve(root, 'data/paths.json'), 'utf-8'));
const unlocks = JSON.parse(readFileSync(resolve(root, 'data/unlocks.json'), 'utf-8'));
const challenges = JSON.parse(readFileSync(resolve(root, 'data/challenges.json'), 'utf-8'));
const transformations = JSON.parse(readFileSync(resolve(root, 'data/transformations.json'), 'utf-8'));

function dupes(list) {
  const seen = new Set();
  const out = [];
  for (const id of list) {
    if (seen.has(id)) out.push(id);
    seen.add(id);
  }
  return [...new Set(out)];
}

function missingFields(entity, requiredFields) {
  return entity.filter((entry) => requiredFields.some((field) => entry[field] === undefined || entry[field] === null || entry[field] === ''));
}

const itemIds = items.map((i) => String(i.id));
const trinketIds = trinkets.map((i) => String(i.id));

const missingItemIcons = items.filter((i) => {
  const local = existsSync(resolve(root, `icons/${i.id}.png`));
  const remote = Boolean(i.icon_url);
  return !local && !remote;
});
const missingTrinketIcons = trinkets.filter((i) => {
  const local = existsSync(resolve(root, `icons/trinkets/${i.id}.png`));
  const remote = Boolean(i.icon_url);
  return !local && !remote;
});

const report = {
  counts: {
    items: items.length,
    trinkets: trinkets.length,
    paths: paths.length,
    unlocks: unlocks.length,
    challenges: challenges.length,
    transformations: transformations.length,
  },
  duplicates: {
    items: dupes(itemIds),
    trinkets: dupes(trinketIds),
  },
  missingRequiredFields: {
    items: missingFields(items, ['id', 'name', 'description']),
    trinkets: missingFields(trinkets, ['id', 'name', 'description']),
  },
  missingIcons: {
    items: missingItemIcons.map((i) => i.id),
    trinkets: missingTrinketIcons.map((i) => i.id),
  },
};

console.log(JSON.stringify(report, null, 2));

const hasErrors =
  report.duplicates.items.length > 0 ||
  report.duplicates.trinkets.length > 0 ||
  report.missingRequiredFields.items.length > 0 ||
  report.missingRequiredFields.trinkets.length > 0;

if (hasErrors) process.exit(1);

