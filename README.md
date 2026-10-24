# Community specials

A shared pool of portrait flyers from local businesses in Grabouw. Any
community website — a school, a rugby club, a business — can display the
flyers that choose to appear on it. It is free, unpaid community promotion:
no ad network, no third-party scripts, no cookies, no tracking.

**Every flyer decides for itself which sites may show it.** A school never
shows alcohol, and nothing gambling-related shows anywhere.

This README is written for everyone, not only developers.

---

## 1. How to add a flyer (four steps)

1. **Put the image in the `flyers/` folder.** Give it a short, clear file
   name in lowercase, for example `flyers/anna-bakery-bread-deal.webp`.
2. **Add an entry to `specials.json`.** Copy an existing entry and change
   every field. Use the same `id` as the file name (kebab-case). Write both
   the English (`altEn`, `captionEn`) and Afrikaans (`altAf`, `captionAf`)
   text — short and plain.
3. **Choose `showOn`.** List the site ids allowed to show the flyer, for
   example `["groenberg-school", "rugby-club"]`, or `["*"]` for every site
   that allows the category. Only add a site after its owner agreed (see the
   checklist below).
4. **Open a pull request.** The checks run automatically and a maintainer
   reviews it. Set `"approved": true` only once the business's written
   approval is on file.

## 2. The flyer checklist

- **Portrait, about 3:4** — the automatic check accepts ratios between 5:4
  and 10:7. Landscape and square flyers are rejected.
- **1080 × 1440 pixels recommended**, at least 800 px wide.
- **Under 200 KB.** WebP is best; JPG and PNG also work.
- **The dates printed on the flyer must match `startDate` and `endDate`.**
  Dates are inclusive: the flyer shows from the start date until 23:59 on
  the end date, South African time.
- **Written approval from the business.** A WhatsApp message from the owner
  is enough — keep a screenshot.
- **Approval from each site's owner before you add that site to `showOn`.**

## 3. How to remove or replace a flyer

- **Remove:** delete its entry from `specials.json` (and delete the file
  from `flyers/`). The sites redeploy automatically and it disappears.
- **Replace:** put the new image under the same file name, or add a new file
  and point the entry at it. If the dates change, update `startDate` /
  `endDate` too.

## 4. How to register a new site

1. Add the site to `sites.json`: a kebab-case `id`, its `name`, `url`,
   `locales` (`"en"`, `"af"` or both), `blockedCategories` (usually
   `["gambling", "tobacco"]`), and `childFocused` (`true` for anything aimed
   at children — alcohol can never appear there).
2. In Vercel, open the site's project → **Settings → Git → Deploy Hooks** →
   **Create Hook** (name it `community-specials`). Copy the hook URL.
3. In this GitHub repository → **Settings → Secrets and variables →
   Actions → New repository secret**. The name must be
   `DEPLOY_HOOK_` plus the site id in UPPERCASE with dashes as underscores:
   - `groenberg-school` → `DEPLOY_HOOK_GROENBERG_SCHOOL`
   - `rugby-club` → `DEPLOY_HOOK_RUGBY_CLUB`
4. Add one line to `.github/workflows/deploy.yml` under `env:` so the daily
   job can see the new secret (copy the existing lines).

Every night at 02:00 South African time the action calls each hook, so
expired flyers disappear and new ones appear without anyone logging in. A
site with no secret is skipped with a note in the log — nothing breaks.

## 5. Draft community partners policy (for site owners)

Adapt this to your own site:

1. No gambling, tobacco or loan-shark advertising — ever.
2. Alcohol only on adult-audience sites, always with the visible
   "18+ · Not for persons under 18" notice.
3. Every flyer is clearly labelled as a local business.
4. Every flyer is approved in writing before it is published.
5. Flyers never appear on help, support or crisis pages.
6. The site owner may remove any flyer at any time, no reasons needed.

---

## For site developers

Install the kit from GitHub (any Next.js site):

```bash
pnpm add github:evamerica0442/community-specials
```

The `prepare` script builds the package on install. If installing from git
ever gives trouble, copy the `kit/` folder into your repository instead —
Next.js compiles those TypeScript files with your app, and the only runtime
needs are `react` and, for the sync step, `sharp`. Everything below works
the same.

**Sync at build time** (downloads only your site's current flyers, converts
them to WebP, never fails your build):

```ts
// next.config or scripts/prebuild.mts
import { syncSpecials } from 'community-specials';

await syncSpecials({
  siteId: 'groenberg-school',
  feedUrl: 'https://raw.githubusercontent.com/evamerica0442/community-specials/main/specials.json',
  outDir: 'public/specials',
});
```

On any failure it restores the last good cache from `cacheFile`
(default: `outDir/specials-cache.json`) and logs a warning. Flyers are only
downloaded from the feed's own domain.

**Render** (client components, no Tailwind, theme with CSS custom
properties):

```tsx
'use client';
import { SpecialsStrip, SpecialsGrid } from 'community-specials/components';

<SpecialsStrip items={manifest.items} locale="en" basePath="/specials" />
<SpecialsGrid items={manifest.items} locale="af" basePath="/specials" />
```

Theme variables (set on `:root` or a wrapper): `--specials-accent`,
`--specials-bg`, `--specials-ink`, `--specials-muted`, `--specials-radius`.
Labels can be overridden with the `labels` prop in either language.

The components filter by date again in the browser (Africa/Johannesburg), so
an expired flyer never renders even if the build was days ago.

**Repository scripts:** `pnpm validate` checks every flyer and targeting
rule; `pnpm test` runs the unit tests; `pnpm generate:samples` rebuilds the
two demo flyers. `demo/` is a small Next.js app showing the strip and grid
in both languages: `pnpm --dir demo build && pnpm --dir demo start`.

The two sample flyers (`sample-*`) are test fixtures: they target only the
reserved `demo-site` id, and the validator refuses any fixture that also
targets a real site.
