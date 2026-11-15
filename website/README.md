# The Pretentious Peacock website

The public website for the mixology service. It is a single static page with no
build step: `index.html`, `styles.css`, `main.js` and the brand files in `assets/`.
It lives in this folder so it stays separate from the menu app in the rest of the
repository.

## What is on the page

- **The peacock.** The tail unfurls on load and sways with the pointer. Click it
  and it folds, displays again and scatters olives.
- **Pretension dial.** A slider that rewrites the headlines across the page, from
  Modest to Insufferable.
- **Find your drink.** Pick a spirit and a mood and a cocktail is poured into the
  right glass. The recipes match the menu app's library.
- **The regulars.** Six cards that turn over to show the recipe.
- **Event planner.** Guests, hours and thirst give a rough count of cocktails,
  bartenders, ice and citrus.
- **Enquiry form.** Writes the email for the visitor and opens it in their own
  mail app. Nothing is sent or stored by the site.

Animation is switched off for visitors who ask their device for reduced motion.

## Settings

Edit `config.js`:

- `menuUrl` is the address of the live guest menu. Once set, "Tonight's menu" links
  appear in the header, the menu section and the footer.
- `enquiryEmail` is the address enquiries are sent to.

## Previewing

```sh
cd website
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploying

Hosting is free on GitHub Pages. In the repository, open Settings, then Pages, and
set Source to "GitHub Actions". After that, every change to `website/` on `main` is
published by `.github/workflows/deploy-website.yml`.

All paths are relative, so the folder also works as it is on Cloudflare Pages or
any other static host: point the host at `website/` with no build command.
