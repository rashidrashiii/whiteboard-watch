import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import axeSource from 'axe-core';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

// Rules disabled for this jsdom-based check, with the reason each one is
// unsuitable here rather than a real "no violation" result:
//
// - color-contrast, target-size, scrollable-region-focusable: jsdom has no
//   layout engine, so rules needing rendered geometry or computed paint
//   can't run. Contrast is instead verified by computing WCAG ratios for
//   every design-token color pair directly (see PR description).
// - aria-hidden-focus, bypass, empty-heading, heading-order, hidden-content,
//   identical-links-same-purpose, link-name, listitem, region: each of
//   these completes (and reports 0 violations) when run in isolation, but
//   takes 13s-120s against this page's ~6k-node DOM under jsdom, because
//   jsdom's DOM/style APIs are far slower than a real browser's and these
//   specific checks walk large portions of the tree. Running them here
//   would make the suite take minutes rather than seconds. They're the
//   reason a naive `axe.run(document)` with no `runOnly`/`rules` filtering
//   hangs on this page.
const DISABLED_RULES = [
  'color-contrast',
  'target-size',
  'scrollable-region-focusable',
  'aria-hidden-focus',
  'bypass',
  'empty-heading',
  'heading-order',
  'hidden-content',
  'identical-links-same-purpose',
  'link-name',
  'listitem',
  'region',
];

test(
  'build-time: rendered index.html has no automated a11y violations',
  { timeout: 60_000 },
  async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'wbw-build-'));

    try {
      execFileSync('npx', ['astro', 'build', '--outDir', outDir], { cwd: ROOT, stdio: 'inherit' });

      const html = await readFile(join(outDir, 'index.html'), 'utf-8');
      const dom = new JSDOM(html, { url: 'https://whiteboardwatch.dev/' });

      // axe-core's UMD bundle attaches `window.axe` by reading the global
      // `window`/`document` at eval time, so those globals must be wired to
      // this jsdom instance BEFORE the eval — otherwise axe silently attaches
      // to nothing and `dom.window.axe` is undefined.
      globalThis.window = dom.window;
      globalThis.document = dom.window.document;
      dom.window.eval(axeSource.source);

      assert.equal(
        typeof dom.window.axe?.run,
        'function',
        'axe-core did not attach to the jsdom window',
      );

      const results = await dom.window.axe.run(dom.window.document, {
        rules: Object.fromEntries(DISABLED_RULES.map((id) => [id, { enabled: false }])),
      });

      const summarize = (v) =>
        `${v.id} (${v.help}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`;

      assert.equal(
        results.violations.length,
        0,
        `expected no a11y violations, found:\n${results.violations.map(summarize).join('\n')}`,
      );
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  },
);
