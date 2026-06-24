#!/usr/bin/env node
// Rebuilds data/items.fallback.json and data/trinkets.json from the canonical
// Platinum God export (data/sources/platinumgod.txt). The export uses the real
// in-game collectible/trinket IDs, which is what the rest of the app, the icon
// source (RebirthItemTracker) and the Steam/wiki ecosystem rely on.
//
// Usage: node scripts/rebuild-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { deriveTags, toPool } from './data-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'data', 'sources', 'platinumgod.txt');

const isHeader = (t) => /^##\s/.test(t);
const idLine = (t) => t.match(/^(Item|Trinket)ID:\s*(\d+)\s*$/);

function tokenize(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function stripQuote(line) {
  const m = line.match(/^"(.*)"$/);
  return m ? m[1].trim() : null;
}

function parseBlock(name, idNum, body) {
  let quote;
  let quality;
  let type;
  let poolLine;
  const descParts = [];
  for (const line of body) {
    const q = stripQuote(line);
    if (q != null && quote == null) {
      quote = q;
      continue;
    }
    const ql = line.match(/^Quality:\s*(\d+)/i);
    if (ql) {
      quality = Number(ql[1]);
      continue;
    }
    const tl = line.match(/^Type:\s*(.+)/i);
    if (tl) {
      type = tl[1].trim();
      continue;
    }
    const pl = line.match(/^Item Pool:\s*(.+)/i);
    if (pl) {
      poolLine = pl[1].trim();
      continue;
    }
    // Unlock instructions are useful trivia but not part of the effect text.
    if (/^Unlock this (item|trinket)\b/i.test(line)) continue;
    descParts.push(line);
  }
  return { name, id: String(idNum), quote, quality, type, poolLine, description: descParts.join(' ') };
}

function build() {
  const toks = tokenize(readFileSync(SRC, 'utf8'));
  // Mark stop boundaries: headers and ID lines.
  const idIdx = [];
  const headerIdx = new Set();
  for (let i = 0; i < toks.length; i++) {
    if (isHeader(toks[i])) headerIdx.add(i);
    else if (idLine(toks[i])) idIdx.push(i);
  }

  function nextStop(after) {
    let stop = toks.length;
    for (const idx of idIdx) {
      if (idx > after) { stop = Math.min(stop, idx); break; }
    }
    for (const h of headerIdx) {
      if (h > after && h < stop) stop = h;
    }
    return stop;
  }

  const itemMap = new Map();
  const trinketMap = new Map();

  // Some collectibles are listed twice in the export (e.g. Birthright lists a
  // normal and a "(Tainted)" variant under the same ID). Merge them into one.
  function upsert(map, entity) {
    const existing = map.get(entity.id);
    if (!existing) {
      map.set(entity.id, entity);
      return;
    }
    if (/\(tainted\)/i.test(existing.name) && !/\(tainted\)/i.test(entity.name)) {
      existing.name = entity.name;
    }
    const parts = [existing.description, entity.description].filter(Boolean);
    existing.description = [...new Set(parts)].join(' ');
    existing.tags = [...new Set([...(existing.tags || []), ...(entity.tags || [])])].sort();
  }

  for (const i of idIdx) {
    const m = idLine(toks[i]);
    const kind = m[1]; // Item | Trinket
    const idNum = Number(m[2]);
    const name = toks[i - 1];
    const stop = nextStop(i);
    // If the stop is the next ID line, the token right before it is the next
    // entry's name, so exclude it from this block's body.
    const stopIsId = idIdx.includes(stop);
    const bodyEnd = stopIsId ? stop - 1 : stop;
    const body = toks.slice(i + 1, bodyEnd);
    const parsed = parseBlock(name, idNum, body);

    if (kind === 'Item') {
      const entity = {
        id: parsed.id,
        name: parsed.name,
        description: parsed.description,
        quality: parsed.quality,
        pool: parsed.poolLine ? toPool(parsed.poolLine) : undefined,
        quote: parsed.quote,
        type: parsed.type,
      };
      entity.tags = deriveTags({ name: entity.name, description: entity.description, quote: entity.quote, pool: entity.pool });
      upsert(itemMap, prune(entity));
    } else {
      const entity = {
        id: parsed.id,
        name: parsed.name,
        description: parsed.description,
        quality: parsed.quality,
        quote: parsed.quote,
      };
      entity.tags = deriveTags({ name: entity.name, description: entity.description, quote: entity.quote });
      upsert(trinketMap, prune(entity));
    }
  }

  const items = [...itemMap.values()].sort((a, b) => Number(a.id) - Number(b.id));
  const trinkets = [...trinketMap.values()].sort((a, b) => Number(a.id) - Number(b.id));

  writeFileSync(join(ROOT, 'data', 'items.fallback.json'), JSON.stringify(items, null, 2) + '\n');
  writeFileSync(join(ROOT, 'data', 'trinkets.json'), JSON.stringify(trinkets, null, 2) + '\n');
  console.log(`Wrote ${items.length} items and ${trinkets.length} trinkets.`);
}

function prune(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

build();
