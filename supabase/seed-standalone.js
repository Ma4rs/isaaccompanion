#!/usr/bin/env node
// Standalone seed script: uses native fetch (Node 18+), no npm packages needed.
// Usage: node supabase/seed-standalone.js

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Load .env file if present
try {
  const envFile = readFileSync(resolve(root, '.env'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^(\w+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  });
} catch { /* no .env file */ }

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env or as environment variables.');
  process.exit(1);
}

const headers = {
  'apikey': SUPABASE_SERVICE_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'resolution=merge-duplicates'
};

function readJson(file) {
  return JSON.parse(readFileSync(resolve(root, file), 'utf-8'));
}

async function upsert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify(rows)
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${table}: ${res.status} ${body}`);
  }
  console.log(`  ${table}: ${rows.length} rows`);
}

async function deleteAll(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=gt.0`, {
    method: 'DELETE',
    headers
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Delete ${table}: ${res.status} ${body}`);
  }
}

async function seedItems() {
  const raw = readJson('data/items.fallback.json');
  const items = (Array.isArray(raw) ? raw : raw.items || []).map(r => ({
    id: String(r.id ?? r.name ?? ''),
    name: String(r.name ?? ''),
    description: r.description ?? null,
    icon_url: r.icon_url ?? r.iconUrl ?? null,
    quality: typeof r.quality === 'number' ? r.quality : null,
    pool: r.pool ?? null,
    quote: r.quote ?? null,
    tags: r.tags ?? [],
    type: r.type ?? null,
    synergies: r.synergies ?? []
  }));
  await upsert('ic_items', items);
}

async function seedTrinkets() {
  const raw = readJson('data/trinkets.json');
  const trinkets = raw.map(t => ({
    id: t.id, name: t.name,
    description: t.description ?? null,
    quality: t.quality ?? null
  }));
  await upsert('ic_trinkets', trinkets);
}

async function seedPaths() {
  const raw = readJson('data/paths.json');
  const paths = raw.map(p => ({ id: p.id, name: p.name, description: p.description ?? null }));
  await upsert('ic_paths', paths);

  const steps = [];
  raw.forEach(p => {
    (p.steps || []).forEach((s, i) => {
      steps.push({ path_id: p.id, step_id: s.id, label: s.label, sort_order: i });
    });
  });
  await upsert('ic_path_steps', steps);
}

async function seedUnlocks() {
  const raw = readJson('data/unlocks.json');
  const unlocks = raw.map(u => ({
    id: u.id, character_name: u.characterName, target_unlock: u.targetUnlock
  }));
  await upsert('ic_unlocks', unlocks);

  const steps = [];
  raw.forEach(u => {
    (u.steps || []).forEach((s, i) => {
      steps.push({ unlock_id: u.id, step_id: s.id, label: s.label, sort_order: i });
    });
  });
  await upsert('ic_unlock_steps', steps);

  await deleteAll('ic_unlock_rewards');
  const rewards = [];
  raw.forEach(u => {
    (u.rewards || []).forEach(r => {
      rewards.push({ unlock_id: u.id, boss: r.boss, unlock: r.unlock });
    });
  });
  // Insert in batches (PostgREST has payload limits)
  const BATCH = 100;
  for (let i = 0; i < rewards.length; i += BATCH) {
    const batch = rewards.slice(i, i + BATCH);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/ic_unlock_rewards`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify(batch)
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`ic_unlock_rewards batch: ${res.status} ${body}`);
    }
  }
  console.log(`  ic_unlock_rewards: ${rewards.length} rows`);
}

async function seedChallenges() {
  const raw = readJson('data/challenges.json');
  const challenges = raw.map(c => ({
    id: c.id, number: c.number, name: c.name,
    description: c.description ?? null, character: c.character ?? null,
    goal: c.goal ?? null, unlock: c.unlock ?? null,
    restrictions: c.restrictions ?? [], difficulty: c.difficulty ?? null
  }));
  await upsert('ic_challenges', challenges);
}

async function seedTransformations() {
  const raw = readJson('data/transformations.json');
  const transformations = raw.map(t => ({
    id: t.id, name: t.name, description: t.description ?? null, requires: t.requires
  }));
  await upsert('ic_transformations', transformations);

  await deleteAll('ic_transformation_items');
  const items = [];
  raw.forEach(t => {
    (t.items || []).forEach(itemName => {
      items.push({ transformation_id: t.id, item_name: itemName });
    });
  });
  const BATCH = 100;
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/ic_transformation_items`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify(batch)
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`ic_transformation_items batch: ${res.status} ${body}`);
    }
  }
  console.log(`  ic_transformation_items: ${items.length} rows`);
}

async function main() {
  console.log('Seeding Supabase database...\n');
  await seedItems();
  await seedTrinkets();
  await seedPaths();
  await seedUnlocks();
  await seedChallenges();
  await seedTransformations();
  console.log('\nDone!');
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
