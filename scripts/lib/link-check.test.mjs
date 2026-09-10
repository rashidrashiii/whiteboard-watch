import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLinks } from './link-check.mjs';

function makeCompany(overrides) {
  return {
    id: 'test-co',
    name: 'Test Co',
    url: 'https://example.com',
    location: '',
    description: '',
    section: 'A–C',
    tags: [],
    salaryLinks: { levelsFyi: '', glassdoor: '' },
    linkStatus: 'unknown',
    lastVerified: null,
    ...overrides,
  };
}

test('successful check sets linkStatus ok and lastVerified to today', async () => {
  const companies = [makeCompany({ id: 'ok-co', lastVerified: '2024-01-01' })];
  const fetchImpl = async () => ({ ok: true, status: 200 });

  const [result] = await checkLinks(companies, { fetchImpl });

  assert.equal(result.linkStatus, 'ok');
  assert.equal(result.lastVerified, new Date().toISOString().slice(0, 10));
});

test('failed check sets linkStatus broken but never clears lastVerified', async () => {
  const companies = [makeCompany({ id: 'broken-co', lastVerified: '2024-01-01' })];
  const fetchImpl = async () => ({ ok: false, status: 500 });

  const [result] = await checkLinks(companies, { fetchImpl });

  assert.equal(result.linkStatus, 'broken');
  assert.equal(result.lastVerified, '2024-01-01');
});

test('failed check on a never-verified company leaves lastVerified null', async () => {
  const companies = [makeCompany({ id: 'new-co', lastVerified: null })];
  const fetchImpl = async () => ({ ok: false, status: 500 });

  const [result] = await checkLinks(companies, { fetchImpl });

  assert.equal(result.linkStatus, 'broken');
  assert.equal(result.lastVerified, null);
});

test('mixed batch: one success and one failure each get correct carry-forward', async () => {
  const companies = [
    makeCompany({ id: 'ok-co', url: 'https://ok.example.com', lastVerified: '2023-05-05' }),
    makeCompany({ id: 'broken-co', url: 'https://broken.example.com', lastVerified: '2023-05-05' }),
  ];
  const fetchImpl = async (url) => {
    if (url === 'https://ok.example.com') return { ok: true, status: 200 };
    return { ok: false, status: 404 };
  };

  const results = await checkLinks(companies, { fetchImpl });
  const ok = results.find((c) => c.id === 'ok-co');
  const broken = results.find((c) => c.id === 'broken-co');

  assert.equal(ok.linkStatus, 'ok');
  assert.equal(ok.lastVerified, new Date().toISOString().slice(0, 10));
  assert.equal(broken.linkStatus, 'broken');
  assert.equal(broken.lastVerified, '2023-05-05');
});

test('403 falls back to a ranged GET with User-Agent and succeeds', async () => {
  const companies = [makeCompany({ id: 'head-blocked', lastVerified: null })];
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push(opts.method);
    if (opts.method === 'HEAD') return { ok: false, status: 403 };
    assert.equal(opts.headers.Range, 'bytes=0-512');
    assert.ok(opts.headers['User-Agent']);
    return { ok: true, status: 206 };
  };

  const [result] = await checkLinks(companies, { fetchImpl });

  assert.deepEqual(calls, ['HEAD', 'GET']);
  assert.equal(result.linkStatus, 'ok');
});

test('405 falls back to GET and a persistent failure stays broken', async () => {
  const companies = [makeCompany({ id: 'always-fails', lastVerified: '2022-01-01' })];
  const fetchImpl = async (url, opts) => {
    if (opts.method === 'HEAD') return { ok: false, status: 405 };
    return { ok: false, status: 500 };
  };

  const [result] = await checkLinks(companies, { fetchImpl });

  assert.equal(result.linkStatus, 'broken');
  assert.equal(result.lastVerified, '2022-01-01');
});

test('3xx redirect status counts as success even when ok is false', async () => {
  const companies = [makeCompany({ id: 'redirected', lastVerified: null })];
  const fetchImpl = async () => ({ ok: false, status: 301 });

  const [result] = await checkLinks(companies, { fetchImpl });

  assert.equal(result.linkStatus, 'ok');
});

test('a fetch that throws (e.g. abort/timeout) is treated as a failure', async () => {
  const companies = [makeCompany({ id: 'timed-out', lastVerified: '2021-12-31' })];
  const fetchImpl = async () => {
    throw new Error('The operation was aborted');
  };

  const [result] = await checkLinks(companies, { fetchImpl });

  assert.equal(result.linkStatus, 'broken');
  assert.equal(result.lastVerified, '2021-12-31');
});

test('checks all companies even with more entries than the concurrency limit', async () => {
  const companies = Array.from({ length: 20 }, (_, i) =>
    makeCompany({ id: `co-${i}`, url: `https://example.com/${i}` }),
  );
  const fetchImpl = async () => ({ ok: true, status: 200 });

  const results = await checkLinks(companies, { fetchImpl, concurrency: 5 });

  assert.equal(results.length, 20);
  assert.ok(results.every((c) => c.linkStatus === 'ok'));
});
