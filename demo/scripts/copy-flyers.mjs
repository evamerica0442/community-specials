import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const target = path.resolve(here, '../public/flyers');

await mkdir(target, { recursive: true });
await cp(path.join(repoRoot, 'flyers'), target, { recursive: true, force: true });
console.log(`copied flyers to ${path.relative(repoRoot, target)}`);
