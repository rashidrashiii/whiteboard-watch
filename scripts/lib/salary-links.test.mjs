import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSalaryLinks } from './salary-links.mjs';

test('builds the exact levels.fyi and glassdoor URL templates', () => {
  const links = buildSalaryLinks('Acme Corp');
  assert.equal(links.levelsFyi, 'https://www.levels.fyi/?search=Acme%20Corp');
  assert.equal(
    links.glassdoor,
    'https://www.glassdoor.com/Search/results.htm?keyword=Acme%20Corp',
  );
});

test('encodes special characters in the company name for both templates', () => {
  const links = buildSalaryLinks('R&D / Co+');
  const encoded = encodeURIComponent('R&D / Co+');
  assert.equal(links.levelsFyi, `https://www.levels.fyi/?search=${encoded}`);
  assert.equal(links.glassdoor, `https://www.glassdoor.com/Search/results.htm?keyword=${encoded}`);
});
