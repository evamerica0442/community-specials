import { describe, expect, it } from 'vitest';

import { specialsFileSchema, type Site, type Special } from '../kit/schemas.js';
import {
  DEMO_SITE_ID,
  demoSite,
  getActiveSpecials,
  isActiveOnDate,
  johannesburgDate,
} from '../kit/specials.js';

const school: Site = {
  id: 'groenberg-school',
  name: 'School',
  url: 'https://example.com',
  locales: ['en', 'af'],
  blockedCategories: ['liquor', 'gambling', 'tobacco'],
  childFocused: true,
};

const club: Site = {
  id: 'rugby-club',
  name: 'Club',
  url: 'https://example.com',
  locales: ['en'],
  blockedCategories: ['gambling', 'tobacco'],
  childFocused: false,
};

// Blocks liquor but is NOT child-focused: isolates the two liquor rules.
const adultVenue: Site = {
  id: 'adult-venue',
  name: 'Venue',
  url: 'https://example.com',
  locales: ['en', 'af'],
  blockedCategories: ['liquor'],
  childFocused: false,
};

// Child-focused but does not block liquor: isolates the childFocused rule.
const childCentre: Site = {
  id: 'child-centre',
  name: 'Child centre',
  url: 'https://example.com',
  locales: ['en'],
  blockedCategories: [],
  childFocused: true,
};

const ALL_SITES = [school, club, adultVenue, childCentre, demoSite];

const NOW = new Date('2026-10-24T12:00:00+02:00');

function special(overrides: Partial<Special> = {}): Special {
  return {
    id: 'test-special',
    businessId: 'test-biz',
    businessName: 'Test Business',
    category: 'food',
    flyer: 'flyers/test.webp',
    altEn: 'English alt',
    altAf: 'Afrikaanse alt',
    captionEn: 'English caption',
    captionAf: 'Afrikaanse byskrif',
    url: 'https://example.com',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    showOn: ['groenberg-school'],
    approved: true,
    ...overrides,
  };
}

describe('getActiveSpecials', () => {
  it('returns an approved, in-date special that targets the site', () => {
    const result = getActiveSpecials([special()], { siteId: 'groenberg-school', sites: ALL_SITES, now: NOW });
    expect(result).toHaveLength(1);
  });

  it('excludes expired specials', () => {
    const result = getActiveSpecials(
      [special({ endDate: '2026-10-23' })],
      { siteId: 'groenberg-school', sites: ALL_SITES, now: NOW },
    );
    expect(result).toHaveLength(0);
  });

  it('excludes specials that have not started yet', () => {
    const result = getActiveSpecials(
      [special({ startDate: '2026-10-25' })],
      { siteId: 'groenberg-school', sites: ALL_SITES, now: NOW },
    );
    expect(result).toHaveLength(0);
  });

  it('excludes unapproved specials', () => {
    const result = getActiveSpecials(
      [special({ approved: false })],
      { siteId: 'groenberg-school', sites: ALL_SITES, now: NOW },
    );
    expect(result).toHaveLength(0);
  });

  it('excludes specials that only target a different site', () => {
    const result = getActiveSpecials(
      [special({ showOn: ['rugby-club'] })],
      { siteId: 'groenberg-school', sites: ALL_SITES, now: NOW },
    );
    expect(result).toHaveLength(0);
  });

  it('honours "*" targeting on sites that allow the category', () => {
    const result = getActiveSpecials(
      [special({ showOn: ['*'] })],
      { siteId: 'groenberg-school', sites: ALL_SITES, now: NOW },
    );
    expect(result).toHaveLength(1);
  });

  it('applies blockedCategories even for explicit targeting', () => {
    const result = getActiveSpecials(
      [special({ category: 'liquor', showOn: ['adult-venue'] })],
      { siteId: 'adult-venue', sites: ALL_SITES, now: NOW },
    );
    expect(result).toHaveLength(0);
  });

  it('applies blockedCategories through "*" but still shows the special elsewhere', () => {
    const list = [special({ category: 'liquor', showOn: ['*'] })];
    expect(getActiveSpecials(list, { siteId: 'adult-venue', sites: ALL_SITES, now: NOW })).toHaveLength(0);
    expect(getActiveSpecials(list, { siteId: 'rugby-club', sites: ALL_SITES, now: NOW })).toHaveLength(1);
  });

  it('never shows liquor on a child-focused site, even without a category block', () => {
    const list = [special({ category: 'liquor', showOn: ['*'] })];
    expect(getActiveSpecials(list, { siteId: 'child-centre', sites: ALL_SITES, now: NOW })).toHaveLength(0);
    const explicit = [special({ category: 'liquor', showOn: ['child-centre'] })];
    expect(getActiveSpecials(explicit, { siteId: 'child-centre', sites: ALL_SITES, now: NOW })).toHaveLength(0);
  });

  it('throws a helpful error for an unknown site', () => {
    expect(() =>
      getActiveSpecials([special()], { siteId: 'nope', sites: ALL_SITES, now: NOW }),
    ).toThrow(/Unknown site "nope"/);
  });
});

describe('Africa/Johannesburg date boundaries', () => {
  it('maps instants to the Johannesburg calendar date', () => {
    // 23:59:59 in Johannesburg on 5 March 2026 is 21:59:59 UTC.
    expect(johannesburgDate(new Date('2026-03-05T21:59:59Z'))).toBe('2026-03-05');
    // One second later it is the next day in Johannesburg.
    expect(johannesburgDate(new Date('2026-03-05T22:00:00Z'))).toBe('2026-03-06');
  });

  it('keeps a special active until 23:59:59 Johannesburg on its end date', () => {
    const oneDay = { startDate: '2026-03-05', endDate: '2026-03-05' };
    expect(isActiveOnDate(oneDay, new Date('2026-03-05T21:59:59Z'))).toBe(true);
    expect(isActiveOnDate(oneDay, new Date('2026-03-05T22:00:00Z'))).toBe(false);
  });

  it('starts a special at midnight Johannesburg on its start date', () => {
    const starting = { startDate: '2026-03-06', endDate: '2026-03-06' };
    expect(isActiveOnDate(starting, new Date('2026-03-05T22:00:00Z'))).toBe(true);
    expect(isActiveOnDate(starting, new Date('2026-03-05T21:59:59Z'))).toBe(false);
  });
});

describe('specialsFileSchema', () => {
  it('rejects an end date before the start date', () => {
    const result = specialsFileSchema.safeParse([special({ endDate: '2026-09-30' })]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/must not be before startDate/);
    }
  });

  it('rejects duplicate ids', () => {
    const entry = special();
    const result = specialsFileSchema.safeParse([entry, { ...entry }]);
    expect(result.success).toBe(false);
  });

  it('rejects a flyer url without https', () => {
    const result = specialsFileSchema.safeParse([special({ url: 'http://example.com' })]);
    expect(result.success).toBe(false);
  });
});

describe('demo fixture rule', () => {
  it('demo-site exists for tests and the demo page', () => {
    expect(DEMO_SITE_ID).toBe('demo-site');
    expect(demoSite.childFocused).toBe(false);
  });
});
