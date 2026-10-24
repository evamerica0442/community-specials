// Marks dist/esm as ESM and dist/cjs as CommonJS so Node resolves each
// build correctly regardless of the root "type": "module".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

fs.writeFileSync(path.join(dist, 'esm', 'package.json'), '{"type":"module"}\n');
fs.writeFileSync(path.join(dist, 'cjs', 'package.json'), '{"type":"commonjs"}\n');
console.log('wrote dist package metadata');
