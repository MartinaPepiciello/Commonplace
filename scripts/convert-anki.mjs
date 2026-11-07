// Converts the Anki export (HTML cards, tab-separated) into:
//   - quotes.csv  (same format the app imports/exports)
//   - seed.sql    (initial data for the Cloudflare D1 database)
// Usage: node scripts/convert-anki.mjs ["All decks-....txt"]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const input = process.argv[2] || readdirSync('.').find((f) => f.startsWith('All decks') && f.endsWith('.txt'));
if (!input) throw new Error('No Anki export found');
const raw = readFileSync(input, 'utf8').replace(/""/g, '"');

const CATEGORIES = [
  ['Identity', '#ecdcf8', '#c9b2f0'],
  ['Feelings', '#fde0e6', '#f6b0c4'],
  ['Life', '#e2f5dc', '#ade0bf'],
  ['Character', '#dfeafc', '#abc8f2'],
  ['Art', '#fff0cc', '#f9c39a'],
  ['Reality', '#dbf5f2', '#a3dbe0'],
  ['Funny', '#fff8c9', '#fbdf86'],
  ['Misc', '#eeeef3', '#cfcfdc'],
];

const clean = (html) =>
  (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();

const field = (block, cls) => {
  const m = block.match(new RegExp(`<div class="${cls}">([\\s\\S]*?)</div>`));
  return m ? clean(m[1]) : '';
};

const seen = new Set();
const quotes = [];
const blocks = raw.split('<div class="quote-card ').slice(1);
const t0 = Date.parse('2026-01-01T00:00:00Z');
for (const block of blocks) {
  const category = block.match(/^([A-Za-z]+)/)[1];
  const q = {
    text: field(block, 'quote-text'),
    character: field(block, 'quote-character'),
    book: field(block, 'quote-book'),
    author: field(block, 'quote-author'),
    category,
  };
  const key = q.text.toLowerCase();
  if (!q.text || seen.has(key)) continue; // each card appears twice (front + back)
  seen.add(key);
  quotes.push(q);
}

const csvCell = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const csv = ['quote,character,book,author,category']
  .concat(quotes.map((q) => [q.text, q.character, q.book, q.author, q.category].map(csvCell).join(',')))
  .join('\n');
writeFileSync('quotes.csv', '﻿' + csv + '\n');

const sqlStr = (v) => `'${String(v).replace(/'/g, "''")}'`;
const lines = [];
CATEGORIES.forEach(([name, c1, c2], i) => {
  lines.push(
    `INSERT OR IGNORE INTO categories (name, color1, color2, sort, updated_at) VALUES (${sqlStr(name)}, ${sqlStr(c1)}, ${sqlStr(c2)}, ${i}, ${t0});`
  );
});
quotes.forEach((q, i) => {
  const ts = t0 + i * 1000;
  lines.push(
    `INSERT OR IGNORE INTO quotes (id, text, character, book, author, category, created_at, updated_at, deleted) VALUES (${[
      randomUUID(), q.text, q.character, q.book, q.author, q.category,
    ].map(sqlStr).join(', ')}, ${ts}, ${ts}, 0);`
  );
});
writeFileSync('seed.sql', lines.join('\n') + '\n');

const counts = {};
quotes.forEach((q) => (counts[q.category] = (counts[q.category] || 0) + 1));
console.log(`${quotes.length} quotes written to quotes.csv and seed.sql`, counts);
