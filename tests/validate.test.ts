import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Site, Special } from '../kit/schemas.js';
import {
  checkFlyerFile,
  checkTargeting,
  MAX_FLYER_BYTES,
  PORTRAIT_ERROR,
} from '../scripts/validate.js';

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'community-specials-'));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function writeImage(
  name: string,
  options: {
    width: number;
    height: number;
    format?: 'webp' | 'png' | 'jpeg';
    noisy?: boolean;
  },
): Promise<string> {
  const format = options.format ?? 'webp';
  const pipeline = options.noisy
    ? sharp({
        create: {
          width: options.width,
          height: options.height,
          channels: 3,
          background: { r: 90, g: 90, b: 90 },
          noise: { type: 'gaussian', mean: 128, sigma: 40 },
        },
      })
    : sharp({
        create: {
          width: options.width,
          height: options.height,
          channels: 3,
          background: { r: 120, g: 80, b: 40 },
        },
      });
  const file = path.join(dir, name);
  await pipeline.toFormat(format).toFile(file);
  return file;
}

describe('checkFlyerFile', () => {
  it('accepts a 1080 x 1440 portrait flyer', async () => {
    const file = await writeImage('ok.webp', { width: 1080, height: 1440 });
    expect(await checkFlyerFile(file)).toEqual([]);
  });

  it('accepts the tight ends of the 3:4 window (5:4 and 10:7)', async () => {
    const narrow = await writeImage('narrow.webp', { width: 1000, height: 1250 }); // ratio 1.25
    const wide = await writeImage('wide.webp', { width: 1000, height: 1400 }); // ratio 1.40
    expect(await checkFlyerFile(narrow)).toEqual([]);
    expect(await checkFlyerFile(wide)).toEqual([]);
  });

  it('rejects a landscape flyer with the portrait message', async () => {
    const file = await writeImage('landscape.webp', { width: 1440, height: 1080 });
    const errors = await checkFlyerFile(file);
    expect(errors).toContain(PORTRAIT_ERROR);
  });

  it('rejects a square flyer with the portrait message', async () => {
    const file = await writeImage('square.webp', { width: 1080, height: 1080 });
    const errors = await checkFlyerFile(file);
    expect(errors).toContain(PORTRAIT_ERROR);
  });

  it('rejects a flyer narrower than 800 px', async () => {
    const file = await writeImage('small.webp', { width: 700, height: 980 });
    const errors = await checkFlyerFile(file);
    expect(errors.some((error) => error.includes('minimum is 800 px'))).toBe(true);
  });

  it(`rejects a flyer over ${MAX_FLYER_BYTES / 1024} KB`, async () => {
    const file = await writeImage('heavy.png', { width: 1080, height: 1440, format: 'png', noisy: true });
    const errors = await checkFlyerFile(file);
    expect(errors.some((error) => error.includes('maximum is 200 KB'))).toBe(true);
  });

  it('rejects a missing file', async () => {
    const errors = await checkFlyerFile(path.join(dir, 'nope.webp'));
    expect(errors.some((error) => error.includes('does not exist'))).toBe(true);
  });
});

function site(overrides: Partial<Site>): Site {
  return {
    id: 'site-a',
    name: 'Site A',
    url: 'https://example.com',
    locales: ['en'],
    blockedCategories: [],
    childFocused: false,
    ...overrides,
  };
}

function specialEntry(overrides: Partial<Special>): Special {
  return {
    id: 'flyer-one',
    businessId: 'biz',
    businessName: 'Business',
    category: 'food',
    flyer: 'flyers/flyer-one.webp',
    altEn: 'alt',
    altAf: 'alt',
    captionEn: 'caption',
    captionAf: 'byskrif',
    url: 'https://example.com',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    showOn: ['site-a'],
    approved: true,
    ...overrides,
  };
}

describe('checkTargeting', () => {
  it('accepts a normal, allowed targeting', () => {
    const errors = checkTargeting(
      [site({ id: 'site-a' })],
      [specialEntry({})],
    );
    expect(errors).toEqual([]);
  });

  it('names the flyer and site when a blocked category is targeted explicitly', () => {
    const errors = checkTargeting(
      [site({ id: 'site-a', blockedCategories: ['liquor'] })],
      [specialEntry({ category: 'liquor', showOn: ['site-a'] })],
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('flyer-one');
    expect(errors[0]).toContain('site-a');
    expect(errors[0]).toContain('blocks the category');
  });

  it('names the flyer and site when liquor reaches a child-focused site through "*"', () => {
    const errors = checkTargeting(
      [site({ id: 'school', childFocused: true })],
      [specialEntry({ id: 'wine-deal', category: 'liquor', showOn: ['*'] })],
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('wine-deal');
    expect(errors[0]).toContain('school');
    expect(errors[0]).toContain('child-focused');
  });

  it('rejects a showOn site that is not registered', () => {
    const errors = checkTargeting([], [specialEntry({ showOn: ['ghost-site'] })]);
    expect(errors.some((error) => error.includes('ghost-site') && error.includes('not a registered site'))).toBe(true);
  });

  it('allows the demo fixtures to target demo-site only', () => {
    const errors = checkTargeting(
      [site({ id: 'site-a' })],
      [specialEntry({ id: 'sample-x', showOn: ['demo-site'] })],
    );
    expect(errors).toEqual([]);
  });

  it('rejects fixtures that mix demo-site with a real site', () => {
    const errors = checkTargeting(
      [site({ id: 'site-a' })],
      [specialEntry({ id: 'sample-x', showOn: ['demo-site', 'site-a'] })],
    );
    expect(errors.some((error) => error.includes('test fixtures'))).toBe(true);
  });
});

// Flyer files written where the checker can see them (also proves writeImage
// output stays under the size cap for valid samples).
describe('sample fixture generation contract', () => {
  it('a generated sample-size flyer passes the checks', async () => {
    const file = await writeImage('sample-sized.webp', { width: 1080, height: 1440 });
    expect(await checkFlyerFile(file)).toEqual([]);
  });
});
