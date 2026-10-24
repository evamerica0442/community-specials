import type { Site, Special } from './schemas.js';

export const TIME_ZONE = 'Africa/Johannesburg';

/**
 * Today's date (YYYY-MM-DD) in the Africa/Johannesburg time zone. South
 * Africa has no daylight saving, but we still route through Intl so the
 * kit never depends on the server's own clock zone.
 */
export function johannesburgDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * A special runs from startDate to endDate inclusive (end date lasts until
 * 23:59:59 Johannesburg time), so whole-day string comparison is exact.
 */
export function isActiveOnDate(special: Pick<Special, 'startDate' | 'endDate'>, now: Date = new Date()): boolean {
  const today = johannesburgDate(now);
  return special.startDate <= today && today <= special.endDate;
}

/**
 * True when the special opts to appear on this site and every safety rule
 * allows it there: the site does not block the category, and liquor may
 * never appear on a child-focused site — even via ["*"] and even if the
 * site's blockedCategories list does not mention liquor.
 */
export function targetsSite(
  special: Pick<Special, 'category' | 'showOn'>,
  site: Site,
): boolean {
  if (special.category === 'liquor' && site.childFocused) return false;
  if (site.blockedCategories.includes(special.category)) return false;
  return special.showOn.includes(site.id) || special.showOn.includes('*');
}

export type GetActiveOptions = {
  siteId: string;
  sites: Site[];
  now?: Date;
};

/**
 * The specials a site may show right now: approved, inside its date window,
 * opting into the site, and passing every category safety rule.
 */
export function getActiveSpecials(
  list: Special[],
  { siteId, sites, now = new Date() }: GetActiveOptions,
): Special[] {
  const site = sites.find((candidate) => candidate.id === siteId);
  if (!site) {
    const known = sites.map((candidate) => candidate.id).join(', ') || '(none)';
    throw new Error(`Unknown site "${siteId}". Known sites: ${known}. Register it in sites.json first.`);
  }
  return list.filter(
    (special) =>
      special.approved && isActiveOnDate(special, now) && targetsSite(special, site),
  );
}

/**
 * Reserved id for the two built-in sample flyers. The demo page and the
 * tests display them; no real site should register this id, and validate.ts
 * refuses any special that mixes demo-site with a real site.
 */
export const DEMO_SITE_ID = 'demo-site';

export const demoSite: Site = {
  id: DEMO_SITE_ID,
  name: 'Demo site',
  url: 'https://example.com',
  locales: ['en', 'af'],
  blockedCategories: [],
  childFocused: false,
};
