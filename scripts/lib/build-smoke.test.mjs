import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

function escapeHtmlText(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;');
}

test('build-time: rendered index.html contains every company name', async () => {
  execFileSync('npx', ['astro', 'build'], { cwd: ROOT, stdio: 'inherit' });

  const data = JSON.parse(
    await readFile(new URL('../../src/data/companies.json', import.meta.url), 'utf-8'),
  );
  const html = await readFile(new URL('../../dist/index.html', import.meta.url), 'utf-8');

  const missing = data.companies.filter((company) => !html.includes(escapeHtmlText(company.name)));

  assert.equal(
    missing.length,
    0,
    `expected all ${data.companies.length} company names in built HTML, missing ${missing.length}: ${missing
      .slice(0, 5)
      .map((c) => c.name)
      .join(', ')}`,
  );
});
