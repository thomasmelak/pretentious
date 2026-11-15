# The Pretentious Peacock

A bar companion for a craft mixology service. The bartender records what is on the
shelf, the app suggests the cocktails that can be made from it, and each event gets
its own menu and prices. Guests see a live menu that quietly drops any drink whose
ingredients have run out. Orders are logged as cash or digital, with running totals
per event.

## What is in here

| Path | What it is |
| --- | --- |
| `src/routes/+page.svelte` | The guest menu for the live event |
| `src/routes/bar/` | Staff screens: inventory, recipes, events, orders |
| `src/lib/shared/` | Recipe library and all the rules (availability, pricing, totals). Used by both the app and the server |
| `worker/index.ts` | The API, a Cloudflare Worker storing data in a D1 database |
| `migrations/` | Database schema |
| `tests/` | Tests for the shared rules |

The app is SvelteKit, built as a static client-rendered site. The API is a single
Cloudflare Worker, which fits the free plan. Guests can read the menu without
signing in; every other request needs the bar passphrase.

## Running it

You need Node 22 or newer.

```sh
npm install
cp .dev.vars.example .dev.vars   # sets the local passphrase to "peacock"
npm run api                      # the API on http://localhost:8787, with a local database
npm run dev                      # the app on http://localhost:5173, in a second terminal
```

Open the app, follow "Behind the bar" and sign in.

Other scripts:

```sh
npm test             # rules tests
npm run check        # type check
npm run build        # static site into ./build
```

## Configuration

API:

- `BAR_PIN` is the staff passphrase, stored as a secret. Required: without it nobody
  can sign in. Locally it comes from `.dev.vars`.
- `ALLOWED_ORIGIN` is the site allowed to call the API. Defaults to any.

App (build time):

- `VITE_API_URL` is the address of the API when the site is hosted somewhere else.
  Leave it unset when the Worker also serves the site.

## Deploying

Not wired up yet. The outline, with a free Cloudflare account:

```sh
npx wrangler login
npx wrangler d1 create pretentious-peacock   # copy the database id into wrangler.jsonc
npx wrangler secret put BAR_PIN
npm run deploy                               # builds, migrates the database, deploys
```

That hosts the API and the site together. To host the site on a static host instead,
build it with `VITE_API_URL` pointing at the Worker.

## How availability works

Each recipe lists its ingredients, and some are marked optional (the olive in a
Martini, the egg white in a sour). A drink is available when every required
ingredient is in stock. When something runs out, the drink stays on the event's
menu for the bartender, marked as hidden, and disappears from the guest menu and
the order screen until the ingredient is back.
