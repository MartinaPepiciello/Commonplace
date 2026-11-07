# Commonplace

A personal quote collection: a random quote on every launch, swipe for another, filter by category, browse and edit in a list, import/export CSV, works offline.

Runs as a Cloudflare Worker (static files + a small API) with a Cloudflare D1 database. Everyone with the link can read; adding, editing and importing need your passcode (entered once per device in Settings).

## Using it

- **Random view**: swipe left (or up) for another quote, swipe right to go back. On desktop use the arrow keys or the buttons.
- **Categories**: tap a chip at the top to only see quotes from that category.
- **List view**: scroll, search, sort; tap a quote to edit it (when unlocked).
- **+**: add a quote (appears once editing is unlocked). Choosing a book you've used before fills in the author.
- **Settings**: unlock/lock editing, export/import CSV, rename, recolour, add or delete categories.
- **Offline**: changes are saved on the device and sync automatically when you're back online. The pill at the top right shows the sync status.
- **Install on your phone**: open the site, then *Share → Add to Home Screen* (iPhone) or *⋮ → Add to Home screen / Install app* (Android).

CSV format (same for import and export): `quote,character,book,author,category`. Import skips quotes already in the collection (ignoring case, punctuation and spacing) and creates any new categories it finds.

## Files

- `public/`: the app (HTML, CSS, JS, service worker, icons)
- `src/worker.js`: the API (`/api/data`, `/api/auth`, `/api/sync`)
- `schema.sql`, `seed.sql`: database tables and your 67 quotes from Anki
- `quotes.csv`: the same quotes as a CSV backup
- `scripts/convert-anki.mjs`: re-runs the Anki conversion; `scripts/build-icons.mjs` regenerates the icons

## First deploy

```bash
npm install
npx wrangler login
npx wrangler d1 create commonplace
```
Copy the `database_id` it prints into `wrangler.jsonc`, then:
```bash
npm run db:init:remote
npx wrangler secret put PASSCODE
npm run deploy
```
(`npm run deploy` prints the URL; to use your own domain, add a custom domain to the `commonplace` Worker in the Cloudflare dashboard.)

## Later changes

`npm run deploy` again. Open phones pick up the new version on their next launch.

## Local development

```bash
npm run db:init:local
npm run dev
```
Then open http://localhost:8787 (local passcode is in `.dev.vars`).
