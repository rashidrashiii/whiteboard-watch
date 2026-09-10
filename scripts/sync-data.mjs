#!/usr/bin/env node
// Fetches the upstream README, parses it, and writes the two generated
// data files. Link-checking (WBW-002) and tag/salary-link generation
// (WBW-003) are not implemented here yet — those fields are written with
// their default values per wbw-artifacts/03-lld.md §1.

import { writeFile, mkdir } from 'node:fs/promises';
import { parseReadme } from './lib/parse.mjs';

const README_URL =
  'https://raw.githubusercontent.com/poteto/hiring-without-whiteboards/main/README.md';
const SOURCE_URL = 'https://github.com/poteto/hiring-without-whiteboards';

// Non-negotiable per LLD §2 — never lower or remove this gate.
const MIN_COMPANIES = 50;

async function main() {
  const res = await fetch(README_URL);
  if (!res.ok) {
    console.error(`Failed to fetch upstream README: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const markdown = await res.text();
  const companies = parseReadme(markdown);

  if (companies.length < MIN_COMPANIES) {
    console.error(
      `Sanity gate failed: parsed only ${companies.length} companies ` +
        `(minimum ${MIN_COMPANIES}). Aborting without publishing.`,
    );
    process.exit(1);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: SOURCE_URL,
    count: companies.length,
    companies,
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;

  await writeFile(new URL('../src/data/companies.json', import.meta.url), json);
  await mkdir(new URL('../public/api/', import.meta.url), { recursive: true });
  await writeFile(new URL('../public/api/companies.json', import.meta.url), json);

  console.log(`Wrote ${companies.length} companies.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
