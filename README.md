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
| `server/main.ts` | The Deno API, storing data in Deno KV |
| `tests/` | Tests for the shared rules |

The app is SvelteKit, built as a static client-rendered site. The API is a single
Deno file. Guests can read the menu without signing in; every other request needs
the bar passphrase.

## Running it

You need [Deno](https://deno.com) 2.

```sh
deno install          # once
deno task api         # the API on http://localhost:8000 (passphrase: peacock)
deno task dev         # the app on http://localhost:5173, in a second terminal
```

Open the app, follow "Behind the bar" and sign in. Set your own passphrase with
`BAR_PIN=something deno task api`.

Other tasks:

```sh
deno task test        # rules tests
deno task check       # type check
deno task build       # static site into ./build
deno task start       # API that also serves ./build, for single-server hosting
```

## Configuration

Server (environment variables):

- `BAR_PIN` is the staff passphrase. Required: without it nobody can sign in.
- `ALLOWED_ORIGIN` is the site allowed to call the API. Defaults to any.
- `PORT` defaults to 8000.
- `KV_PATH` is an optional path for the local database file.

App (build time):

- `VITE_API_URL` is the address of the API when it is hosted somewhere other than
  the site itself. Leave it unset when the server also serves the site.

## How availability works

Each recipe lists its ingredients, and some are marked optional (the olive in a
Martini, the egg white in a sour). A drink is available when every required
ingredient is in stock. When something runs out, the drink stays on the event's
menu for the bartender, marked as hidden, and disappears from the guest menu and
the order screen until the ingredient is back.
