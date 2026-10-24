import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import sharp from 'sharp';
import { ZodError } from 'zod';

import { sitesFileSchema, specialsFileSchema, type Site, type Special } from '../kit/schemas.js';
import { DEMO_SITE_ID } from '../kit/specials.js';

export const MIN_ASPECT = 1.25; // height / width
export const MAX_ASPECT = 1.4; // 3:4 = 1.333…
export const MIN_WIDTH = 800;
export const MAX_FLYER_BYTES = 200 * 1024;
export const PORTRAIT_ERROR = 'Flyer must be portrait, about 3:4 (e.g. 1080 x 1440).';

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);

/**
 * Image checks for one flyer file. Returns a list of problems (empty when
 * the file is fine) so callers can batch-report.
 */
export async function checkFlyerFile(filePath: string): Promise<string[]> {
  const errors: string[] = [];

  let stats;
  try {
    stats = await fs.stat(filePath);
  } catch {
    return [`File does not exist: ${filePath}`];
  }
  if (stats.size > MAX_FLYER_BYTES) {
    errors.push(
      `Flyer is ${Math.round(stats.size / 1024)} KB; the maximum is 200 KB. Compress it (or use WebP).`,
    );
  }

  let metadata;
  try {
    metadata = await sharp(filePath).metadata();
  } catch {
    return errors.concat(`${filePath} is not a readable image.`);
  }

  if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
    errors.push('Flyer must be a WebP, JPG or PNG image.');
  }
  if (!metadata.width || metadata.width < MIN_WIDTH) {
    errors.push(`Flyer is ${metadata.width ?? '?'} px wide; the minimum is 800 px.`);
  }
  if (metadata.width && metadata.height) {
    const aspect = metadata.height / metadata.width;
    if (aspect < MIN_ASPECT || aspect > MAX_ASPECT) {
      errors.push(PORTRAIT_ERROR);
    }
  }
  return errors;
}

/**
 * Targeting rules that need both files: category blocks, the liquor rule,
 * known site ids, and the demo-site fixture rule. Returns a list of
 * problems (empty when everything is allowed).
 */
export function checkTargeting(sites: Site[], specials: Special[]): string[] {
  const errors: string[] = [];
  const siteById = new Map(sites.map((site) => [site.id, site]));

  for (const special of specials) {
    for (const target of special.showOn) {
      if (target !== '*' && target !== DEMO_SITE_ID && !siteById.has(target)) {
        errors.push(
          `"${special.id}": showOn lists "${target}", which is not a registered site. Add it to sites.json or remove it.`,
        );
      }
    }

    if (special.showOn.includes(DEMO_SITE_ID) && special.showOn.length > 1) {
      errors.push(
        `"${special.id}": test fixtures may only target "${DEMO_SITE_ID}" — never a real site.`,
      );
    }

    // A flyer may not target a site that blocks its category, and liquor may
    // never target a child-focused site — including through ["*"].
    const targets = special.showOn.includes('*')
      ? sites.filter((site) => !site.blockedCategories.includes(special.category))
      : special.showOn
          .filter((id) => id !== DEMO_SITE_ID)
          .map((id) => siteById.get(id))
          .filter((site): site is Site => Boolean(site));

    for (const site of targets) {
      if (site.blockedCategories.includes(special.category)) {
        errors.push(
          `"${special.id}" (${special.category}) may not target "${site.id}": that site blocks the category "${special.category}".`,
        );
      }
      if (special.category === 'liquor' && site.childFocused) {
        errors.push(
          `"${special.id}" is a liquor flyer and may never appear on child-focused site "${site.id}".`,
        );
      }
    }
  }
  return errors;
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown;
}

function formatZodError(error: ZodError): string[] {
  return error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`);
}

async function main(): Promise<void> {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const errors: string[] = [];
  let sites: Site[] = [];
  let specials: Special[] = [];

  try {
    sites = sitesFileSchema.parse(await readJson(path.join(root, 'sites.json')));
  } catch (error) {
    errors.push(...(error instanceof ZodError ? formatZodError(error) : [`sites.json: ${String(error)}`]));
  }
  try {
    specials = specialsFileSchema.parse(await readJson(path.join(root, 'specials.json')));
  } catch (error) {
    errors.push(...(error instanceof ZodError ? formatZodError(error) : [`specials.json: ${String(error)}`]));
  }

  errors.push(...checkTargeting(sites, specials));

  for (const special of specials) {
    const flyerPath = path.resolve(root, special.flyer);
    if (!path.dirname(flyerPath).startsWith(path.join(root, 'flyers'))) {
      errors.push(`"${special.id}": flyer must live inside the flyers/ folder.`);
      continue;
    }
    for (const problem of await checkFlyerFile(flyerPath)) {
      errors.push(`"${special.id}": ${problem}`);
    }
  }

  if (errors.length > 0) {
    console.error(`Validation failed with ${errors.length} problem(s):\n`);
    for (const error of errors) console.error(`  ✗ ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`✓ Validated ${specials.length} special(s) across ${sites.length} site(s).`);
}

const invokedDirectly = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;
if (invokedDirectly) {
  void main();
}
