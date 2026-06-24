#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deriveTags, toPool } from './data-utils.mjs';

const root = process.cwd();
const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error('Usage: node scripts/sync-platinumgod-data.mjs <platinumgod-export.txt>');
  process.exit(1);
}

const src = readFileSync(resolve(sourcePath), 'utf-8');
const lines = src.split(/\r?\n/);
const currentItems = JSON.parse(readFileSync(resolve(root, 'data/items.fallback.json'), 'utf-8'));
const currentTrinkets = JSON.parse(readFileSync(resolve(root, 'data/trinkets.json'), 'utf-8'));

function prevNonEmpty(idx) {
  for (let i = idx - 1; i >= 0; i -= 1) {
    const line = lines[i].trim();
    if (line) return line;
  }
  return '';
}

function parseEntry(idLabel) {
  const entryMap = new Map();
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(new RegExp(`^${idLabel}:\\s*(\\d+)\\s*$`));
    if (!m) continue;

    const id = String(Number(m[1]));
    const name = prevNonEmpty(i);
    if (!name || name.startsWith('##') || name.includes('ItemID:') || name.includes('TrinketID:')) continue;
    if (entryMap.has(id)) continue;

    let quote = '';
    let quality = null;
    let pool = '';
    const details = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const line = lines[j].trim();
      if (!line) continue;
      if (line.startsWith('## ')) break;
      if (line.match(/^ItemID:\s*\d+/) || line.match(/^TrinketID:\s*\d+/)) break;
      if (line.startsWith('Quality:')) {
        const q = Number(line.replace('Quality:', '').trim());
        quality = Number.isFinite(q) ? q : null;
        continue;
      }
      if (line.startsWith('Item Pool:')) {
        pool = line.replace('Item Pool:', '').trim();
        continue;
      }
      if (line.startsWith('"') && line.endsWith('"') && !quote) {
        quote = line.slice(1, -1);
        continue;
      }
      if (!line.startsWith('Type:')) {
        details.push(line);
      }
    }

    const description = details.slice(0, 2).join(' ').trim() || quote || 'No description available yet.';
    entryMap.set(id, {
      id,
      name,
      description,
      quality: quality == null ? undefined : quality,
      pool: pool ? toPool(pool) : undefined,
      quote: quote || undefined,
    });
  }
  return entryMap;
}

const parsedItems = parseEntry('ItemID');
const parsedTrinkets = parseEntry('TrinketID');

const itemById = new Map(currentItems.map((item) => [String(item.id), item]));
for (const [id, parsed] of parsedItems.entries()) {
  const existing = itemById.get(id);
  if (existing) {
    const merged = {
      ...existing,
      quality: existing.quality ?? parsed.quality,
      pool: existing.pool ?? parsed.pool,
      quote: existing.quote ?? parsed.quote,
    };
    if (!merged.icon_url && !merged.iconUrl) {
      merged.icon_url = `https://raw.githubusercontent.com/Hyphen-ated/RebirthItemTracker/master/collectibles/collectibles_${String(parsed.id).padStart(3, '0')}.png`;
    }
    merged.tags = deriveTags(merged);
    itemById.set(id, merged);
  } else {
    const base = {
      id: parsed.id,
      name: parsed.name,
      description: parsed.description,
      quality: parsed.quality ?? 1,
      pool: parsed.pool ?? 'treasure',
      quote: parsed.quote,
      icon_url: `https://raw.githubusercontent.com/Hyphen-ated/RebirthItemTracker/master/collectibles/collectibles_${String(parsed.id).padStart(3, '0')}.png`,
    };
    base.tags = deriveTags(base);
    itemById.set(id, base);
  }
}

const canonicalItemIds = new Set(parsedItems.keys());
const items = [...itemById.values()]
  .filter((item) => canonicalItemIds.has(String(item.id)))
  .sort((a, b) => Number(a.id) - Number(b.id));

const trinketById = new Map(currentTrinkets.map((item) => [String(item.id), item]));
for (const [id, parsed] of parsedTrinkets.entries()) {
  const existing = trinketById.get(id);
  if (existing) {
    const merged = {
      ...existing,
      quality: existing.quality ?? parsed.quality,
      description: existing.description || parsed.description,
    };
    merged.tags = deriveTags(merged);
    trinketById.set(id, merged);
  } else {
    const base = {
      id: parsed.id,
      name: parsed.name,
      description: parsed.description,
      quality: parsed.quality ?? 1,
      icon_url: `https://raw.githubusercontent.com/wofsauge/External-Item-Descriptions/master/images/trinkets/${String(parsed.id).padStart(3, '0')}.png`,
    };
    base.tags = deriveTags(base);
    trinketById.set(id, base);
  }
}

const trinkets = [...trinketById.values()]
  .filter((item) => /^\d+$/.test(String(item.id)))
  .sort((a, b) => Number(a.id) - Number(b.id));

writeFileSync(resolve(root, 'data/items.fallback.json'), `${JSON.stringify(items, null, 2)}\n`);
writeFileSync(resolve(root, 'data/trinkets.json'), `${JSON.stringify(trinkets, null, 2)}\n`);

console.log(`Synced items: ${items.length}`);
console.log(`Synced trinkets: ${trinkets.length}`);
console.log(`Canonical item IDs from source: ${parsedItems.size}`);
console.log(`Canonical trinket IDs from source: ${parsedTrinkets.size}`);
console.log('Done.');

