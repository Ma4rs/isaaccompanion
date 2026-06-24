#!/usr/bin/env node
// Downloads canonical item and trinket icons from RebirthItemTracker, keyed by
// the real in-game IDs:
//   item  N -> collectibles/collectibles_<pad3(N)>.png   -> icons/<N>.png
//   trinket N -> collectibles/collectibles_<pad3(2000+N)>.png -> icons/trinkets/<N>.png
//
// Source: Rchardon's fork (the actively maintained Repentance/Repentance+ build);
// its collectibles set is a superset of the original Hyphen-ated tracker and
// covers all late Repentance items/trinkets.
//
// Uses curl (-k) because the corporate proxy intercepts TLS and breaks Node's
// fetch certificate validation.
//
// Usage:
//   node scripts/download-icons.mjs          # only fetch missing icons
//   node scripts/download-icons.mjs --force  # re-fetch everything
import { readFileSync, existsSync, mkdirSync, statSync, rmSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FORCE = process.argv.includes('--force');
const BASE = 'https://raw.githubusercontent.com/Rchardon/RebirthItemTracker/main/collectibles';
const CONCURRENCY = 16;

const pad3 = (n) => String(n).padStart(3, '0');

function loadJSON(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
}

function curl(url, dest) {
  return new Promise((resolve) => {
    execFile('curl', ['-k', '-s', '-f', '-o', dest, url], (err) => {
      if (err) return resolve(false);
      // GitHub raw returns a small "404: Not Found" body for missing files;
      // a valid PNG is well over 60 bytes.
      try {
        if (statSync(dest).size < 60) {
          rmSync(dest, { force: true });
          return resolve(false);
        }
      } catch {
        return resolve(false);
      }
      resolve(true);
    });
  });
}

async function run() {
  const items = loadJSON('data/items.fallback.json');
  const trinkets = loadJSON('data/trinkets.json');

  mkdirSync(join(ROOT, 'icons'), { recursive: true });
  mkdirSync(join(ROOT, 'icons', 'trinkets'), { recursive: true });

  const jobs = [];
  for (const it of items) {
    const dest = join(ROOT, 'icons', `${it.id}.png`);
    if (!FORCE && existsSync(dest)) continue;
    jobs.push({ url: `${BASE}/collectibles_${pad3(it.id)}.png`, dest, label: `item ${it.id}` });
  }
  for (const tr of trinkets) {
    const dest = join(ROOT, 'icons', 'trinkets', `${tr.id}.png`);
    if (!FORCE && existsSync(dest)) continue;
    jobs.push({ url: `${BASE}/collectibles_${pad3(2000 + Number(tr.id))}.png`, dest, label: `trinket ${tr.id}` });
  }

  console.log(`Downloading ${jobs.length} icons (concurrency ${CONCURRENCY}, force=${FORCE})...`);
  let ok = 0;
  let fail = 0;
  const failed = [];
  let idx = 0;
  async function worker() {
    while (idx < jobs.length) {
      const job = jobs[idx++];
      const success = await curl(job.url, job.dest);
      if (success) ok++;
      else {
        fail++;
        failed.push(job.label);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`Done. ${ok} downloaded, ${fail} missing/failed.`);
  if (failed.length) console.log('Missing:', failed.join(', '));
}

run();
