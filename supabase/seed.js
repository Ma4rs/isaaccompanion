#!/usr/bin/env node
// Seed script: reads JSON data files and inserts them into Supabase.
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node supabase/seed.js

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function readJson(file) {
  return JSON.parse(readFileSync(resolve(root, file), 'utf-8'));
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
  const { error } = await supabase.from('ic_items').upsert(items, { onConflict: 'id' });
  if (error) throw new Error(`Items: ${error.message}`);
  console.log(`Seeded ${items.length} items`);
}

async function seedTrinkets() {
  const raw = readJson('data/trinkets.json');
  const trinkets = raw.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description ?? null,
    quality: t.quality ?? null
  }));
  const { error } = await supabase.from('ic_trinkets').upsert(trinkets, { onConflict: 'id' });
  if (error) throw new Error(`Trinkets: ${error.message}`);
  console.log(`Seeded ${trinkets.length} trinkets`);
}

async function seedPaths() {
  const raw = readJson('data/paths.json');
  const paths = raw.map(p => ({ id: p.id, name: p.name, description: p.description ?? null }));
  const { error: pe } = await supabase.from('ic_paths').upsert(paths, { onConflict: 'id' });
  if (pe) throw new Error(`Paths: ${pe.message}`);

  const steps = [];
  raw.forEach(p => {
    (p.steps || []).forEach((s, i) => {
      steps.push({ path_id: p.id, step_id: s.id, label: s.label, sort_order: i });
    });
  });
  const { error: se } = await supabase.from('ic_path_steps').upsert(steps, { onConflict: 'path_id,step_id' });
  if (se) throw new Error(`Path steps: ${se.message}`);
  console.log(`Seeded ${paths.length} paths with ${steps.length} steps`);
}

async function seedUnlocks() {
  const raw = readJson('data/unlocks.json');
  const unlocks = raw.map(u => ({
    id: u.id,
    character_name: u.characterName,
    target_unlock: u.targetUnlock
  }));
  const { error: ue } = await supabase.from('ic_unlocks').upsert(unlocks, { onConflict: 'id' });
  if (ue) throw new Error(`Unlocks: ${ue.message}`);

  const steps = [];
  raw.forEach(u => {
    (u.steps || []).forEach((s, i) => {
      steps.push({ unlock_id: u.id, step_id: s.id, label: s.label, sort_order: i });
    });
  });
  const { error: se } = await supabase.from('ic_unlock_steps').upsert(steps, { onConflict: 'unlock_id,step_id' });
  if (se) throw new Error(`Unlock steps: ${se.message}`);

  const rewards = [];
  raw.forEach(u => {
    (u.rewards || []).forEach(r => {
      rewards.push({ unlock_id: u.id, boss: r.boss, unlock: r.unlock });
    });
  });
  // Rewards don't have a natural unique key, delete and re-insert
  await supabase.from('ic_unlock_rewards').delete().neq('id', 0);
  const { error: re } = await supabase.from('ic_unlock_rewards').insert(rewards);
  if (re) throw new Error(`Unlock rewards: ${re.message}`);
  console.log(`Seeded ${unlocks.length} unlocks with ${steps.length} steps and ${rewards.length} rewards`);
}

async function seedChallenges() {
  const raw = readJson('data/challenges.json');
  const challenges = raw.map(c => ({
    id: c.id,
    number: c.number,
    name: c.name,
    description: c.description ?? null,
    character: c.character ?? null,
    goal: c.goal ?? null,
    unlock: c.unlock ?? null,
    restrictions: c.restrictions ?? [],
    difficulty: c.difficulty ?? null
  }));
  const { error } = await supabase.from('ic_challenges').upsert(challenges, { onConflict: 'id' });
  if (error) throw new Error(`Challenges: ${error.message}`);
  console.log(`Seeded ${challenges.length} challenges`);
}

async function seedTransformations() {
  const raw = readJson('data/transformations.json');
  const transformations = raw.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description ?? null,
    requires: t.requires
  }));
  const { error: te } = await supabase.from('ic_transformations').upsert(transformations, { onConflict: 'id' });
  if (te) throw new Error(`Transformations: ${te.message}`);

  await supabase.from('ic_transformation_items').delete().neq('id', 0);
  const items = [];
  raw.forEach(t => {
    (t.items || []).forEach(itemName => {
      items.push({ transformation_id: t.id, item_name: itemName });
    });
  });
  const { error: ie } = await supabase.from('ic_transformation_items').insert(items);
  if (ie) throw new Error(`Transformation items: ${ie.message}`);
  console.log(`Seeded ${transformations.length} transformations with ${items.length} item mappings`);
}

async function main() {
  console.log('Seeding Supabase database...');
  await seedItems();
  await seedTrinkets();
  await seedPaths();
  await seedUnlocks();
  await seedChallenges();
  await seedTransformations();
  console.log('Done!');
}

main().catch(err => { console.error(err); process.exit(1); });
