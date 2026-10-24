import fs from 'node:fs';

const sites = JSON.parse(fs.readFileSync(new URL('../sites.json', import.meta.url), 'utf8'));

let failures = 0;

for (const site of sites) {
  const secretName = `DEPLOY_HOOK_${site.id.toUpperCase().replace(/-/g, '_')}`;
  const hook = process.env[secretName];
  if (!hook) {
    console.log(`skip ${site.id}: ${secretName} is not set`);
    continue;
  }
  try {
    const response = await fetch(hook, { method: 'POST', signal: AbortSignal.timeout(30_000) });
    if (response.ok) {
      console.log(`${site.id}: deploy hook triggered (${response.status})`);
    } else {
      failures += 1;
      console.log(`${site.id}: deploy hook FAILED (${response.status} ${response.statusText})`);
    }
  } catch (error) {
    failures += 1;
    console.log(`${site.id}: deploy hook error: ${error instanceof Error ? error.message : error}`);
  }
}

console.log(failures > 0 ? `done with ${failures} failure(s)` : 'done');
