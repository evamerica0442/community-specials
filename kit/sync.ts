import fs from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import { sitesFileSchema, specialsFileSchema, type Site, type Special } from './schemas.js';
import { getActiveSpecials } from './specials.js';

export type SyncedItem = Special & { localFile: string };

export type SyncManifest = {
  siteId: string;
  feedUrl: string;
  generatedAt: string;
  items: SyncedItem[];
};

export type SyncOptions = {
  siteId: string;
  /** Absolute or relative URL of the shared specials.json feed. */
  feedUrl: string;
  /** Directory the site's WebP flyers and manifest.json are written to. */
  outDir: string;
  /** Optional path to the last-good cache file used when the sync fails. */
  cacheFile?: string;
  now?: Date;
};

type CachePayload = {
  manifest: SyncManifest;
  files: Array<{ name: string; dataBase64: string }>;
};

const FETCH_TIMEOUT_MS = 15_000;
const MAX_FLYER_WIDTH = 1080;

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Fetch failed with ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as unknown;
}

async function restoreFromCache(
  cacheFile: string,
  outDir: string,
  reason: string,
): Promise<SyncManifest | null> {
  try {
    const raw = await fs.readFile(cacheFile, 'utf8');
    const cache = JSON.parse(raw) as CachePayload;
    await fs.mkdir(outDir, { recursive: true });
    for (const file of cache.files) {
      await fs.writeFile(path.join(outDir, file.name), Buffer.from(file.dataBase64, 'base64'));
    }
    await fs.writeFile(
      path.join(outDir, 'manifest.json'),
      `${JSON.stringify(cache.manifest, null, 2)}\n`,
    );
    console.warn(
      `syncSpecials: ${reason} — restored ${cache.manifest.items.length} flyer(s) from the last good cache.`,
    );
    return cache.manifest;
  } catch {
    return null;
  }
}

/**
 * Build-time sync for one site. Downloads specials.json (plus its sibling
 * sites.json, from the same origin), keeps only the specials this site may
 * show today, downloads their flyers — from the feed's own domain only —
 * converts them to WebP, and writes manifest.json into outDir.
 *
 * This function NEVER throws: on any failure it falls back to the last good
 * cache (restoring the manifest and flyer files), or returns an empty
 * manifest and logs a warning, so a broken feed can never fail a site's
 * build.
 */
export async function syncSpecials(options: SyncOptions): Promise<SyncManifest> {
  const { siteId, feedUrl, outDir } = options;
  const now = options.now ?? new Date();
  const cacheFile = options.cacheFile ?? path.join(outDir, 'specials-cache.json');

  try {
    const feedOrigin = new URL(feedUrl).origin;

    const [specialsRaw, sitesRaw] = await Promise.all([
      fetchJson(feedUrl),
      fetchJson(new URL('sites.json', feedUrl).href),
    ]);
    const specials = specialsFileSchema.parse(specialsRaw);
    const sites = sitesFileSchema.parse(sitesRaw) as Site[];

    const active = getActiveSpecials(specials, { siteId, sites, now });

    await fs.mkdir(outDir, { recursive: true });

    const items: SyncedItem[] = [];
    for (const special of active) {
      const flyerUrl = new URL(special.flyer, feedUrl);
      if (flyerUrl.origin !== feedOrigin) {
        throw new Error(
          `Flyer "${special.flyer}" for "${special.id}" is not on the feed's own domain (${feedOrigin}). Refusing to download it.`,
        );
      }
      const response = await fetch(flyerUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!response.ok) {
        throw new Error(`Downloading ${flyerUrl.href} failed with ${response.status}.`);
      }
      const input = Buffer.from(await response.arrayBuffer());
      const name = `${special.id}.webp`;
      await sharp(input)
        .resize({ width: MAX_FLYER_WIDTH, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(path.join(outDir, name));
      items.push({ ...special, localFile: name });
    }

    // Drop flyers that no longer apply so expired ones really disappear.
    const keep = new Set(items.map((item) => item.localFile).concat(['manifest.json']));
    try {
      for (const entry of await fs.readdir(outDir)) {
        if (entry.endsWith('.webp') && !keep.has(entry)) {
          await fs.rm(path.join(outDir, entry));
        }
      }
    } catch {
      // A missing outDir is fine; it was just created above.
    }

    const manifest: SyncManifest = {
      siteId,
      feedUrl,
      generatedAt: now.toISOString(),
      items,
    };
    await fs.writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

    const files: CachePayload['files'] = [];
    for (const item of items) {
      files.push({
        name: item.localFile,
        dataBase64: (await fs.readFile(path.join(outDir, item.localFile))).toString('base64'),
      });
    }
    await fs.writeFile(cacheFile, JSON.stringify({ manifest, files } satisfies CachePayload));

    return manifest;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const cached = await restoreFromCache(cacheFile, outDir, reason);
    if (cached) return cached;
    console.warn(
      `syncSpecials: ${reason} — no cache available; continuing with an empty specials manifest.`,
    );
    return { siteId, feedUrl, generatedAt: now.toISOString(), items: [] };
  }
}
