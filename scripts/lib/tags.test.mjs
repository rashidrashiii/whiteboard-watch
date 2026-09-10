import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inferTags } from './tags.mjs';

function makeCompany(overrides) {
  return { location: '', description: '', ...overrides };
}

test('Remote tag triggers on location containing "remote" (case-insensitive)', () => {
  assert.deepEqual(inferTags(makeCompany({ location: 'Fully REMOTE' })), ['Remote']);
  assert.deepEqual(inferTags(makeCompany({ location: 'San Francisco, CA' })), []);
});

test('Take-home project tag triggers on "take home" / "take-home"', () => {
  assert.deepEqual(
    inferTags(makeCompany({ description: 'A small take-home assignment' })),
    ['Take-home project'],
  );
  assert.deepEqual(
    inferTags(makeCompany({ description: 'We give a take home project' })),
    ['Take-home project'],
  );
});

test('Pair programming tag triggers on "pairing" and "pair programming"', () => {
  assert.deepEqual(
    inferTags(makeCompany({ description: 'Live pair programming session' })),
    ['Pair programming'],
  );
  assert.deepEqual(
    inferTags(makeCompany({ description: 'You will do some pairing with the team' })),
    ['Pair programming'],
  );
});

test('System design tag triggers on "system design" or "architecture"', () => {
  assert.deepEqual(
    inferTags(makeCompany({ description: 'System design round' })),
    ['System design'],
  );
  assert.deepEqual(
    inferTags(makeCompany({ description: 'Discuss architecture decisions' })),
    ['System design'],
  );
});

test('Live coding tag triggers on "live code" / "live coding"', () => {
  assert.deepEqual(inferTags(makeCompany({ description: 'A live coding exercise' })), [
    'Live coding',
  ]);
});

test('Portfolio review tag triggers on portfolio / github profile / open source variants', () => {
  assert.deepEqual(
    inferTags(makeCompany({ description: 'Show us your portfolio' })),
    ['Portfolio review'],
  );
  assert.deepEqual(
    inferTags(makeCompany({ description: 'We look at your github profile' })),
    ['Portfolio review'],
  );
  assert.deepEqual(
    inferTags(makeCompany({ description: 'Open-source contributions welcome' })),
    ['Portfolio review'],
  );
});

test('Culture fit tag triggers on "culture" or "values"', () => {
  assert.deepEqual(inferTags(makeCompany({ description: 'Culture fit interview' })), [
    'Culture fit',
  ]);
  assert.deepEqual(inferTags(makeCompany({ description: 'We assess our values' })), [
    'Culture fit',
  ]);
});

test('multiple rules can match the same entry, in table order', () => {
  const company = makeCompany({
    location: 'Remote',
    description: 'Take-home project, then a system design and culture fit chat',
  });
  assert.deepEqual(inferTags(company), [
    'Remote',
    'Take-home project',
    'System design',
    'Culture fit',
  ]);
});

test('no matching rules yields an empty tags array', () => {
  assert.deepEqual(inferTags(makeCompany({ location: 'Austin, TX', description: 'n/a' })), []);
});
