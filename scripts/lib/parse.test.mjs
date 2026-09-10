import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseReadme, slugify } from './parse.mjs';

const FIXTURE = `# Hiring Without Whiteboards

Intro text with a stray list item that must be ignored:

- [Ignored PR link](https://github.com/example/pr) | Should not be parsed

## A - C

- [Acme Corp](https://acme.example.com/careers) | Remote | Take-home project, then pairing on-site
- [Bare Co](https://bare.example.com)

## D - F

- [Delta Inc](https://delta.example.com) | San Francisco, CA
`;

test('splits a multi-segment entry into location and description', () => {
  const companies = parseReadme(FIXTURE);
  const acme = companies.find((c) => c.name === 'Acme Corp');
  assert.ok(acme, 'expected Acme Corp to be parsed');
  assert.equal(acme.url, 'https://acme.example.com/careers');
  assert.equal(acme.location, 'Remote');
  assert.equal(acme.description, 'Take-home project, then pairing on-site');
  assert.equal(acme.section, 'A–C');
});

test('parses an entry with no location or description', () => {
  const companies = parseReadme(FIXTURE);
  const bare = companies.find((c) => c.name === 'Bare Co');
  assert.ok(bare, 'expected Bare Co to be parsed');
  assert.equal(bare.location, '');
  assert.equal(bare.description, '');
});

test('ignores entries before the first section header', () => {
  const companies = parseReadme(FIXTURE);
  assert.ok(!companies.some((c) => c.name === 'Ignored PR link'));
});

test('assigns entries to the section they appear under', () => {
  const companies = parseReadme(FIXTURE);
  const delta = companies.find((c) => c.name === 'Delta Inc');
  assert.equal(delta.section, 'D–F');
});

test('writes schema fields with default values pending WBW-002/003', () => {
  const companies = parseReadme(FIXTURE);
  const acme = companies.find((c) => c.name === 'Acme Corp');
  assert.deepEqual(acme.tags, []);
  assert.deepEqual(acme.salaryLinks, { levelsFyi: '', glassdoor: '' });
  assert.equal(acme.linkStatus, 'unknown');
  assert.equal(acme.lastVerified, null);
  assert.equal(acme.id, 'acme-corp');
});

test('slugify collapses non-alphanumeric runs and strips edge hyphens', () => {
  assert.equal(slugify('Acme Corp'), 'acme-corp');
  assert.equal(slugify('  --Weird!! Name??-- '), 'weird-name');
});
