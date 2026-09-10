#!/usr/bin/env node
// Fetches the upstream README, parses it, infers tags, generates salary
// links, and link-checks each entry, then writes the two generated data
// files.

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { parseReadme } from './lib/parse.mjs';
import { inferTags } from './lib/tags.mjs';
import { buildSalaryLinks } from './lib/salary-links.mjs';
import { checkLinks } from './lib/link-check.mjs';

const README_URL =
  'https://raw.githubusercontent.com/poteto/hiring-without-whiteboards/main/README.md';
const SOURCE_URL = 'https://github.com/poteto/hiring-without-whiteboards';

// Non-negotiable per LLD §2 — never lower or remove this gate.
const MIN_COMPANIES = 50;

const COMPANIES_JSON_URL = new URL('../src/data/companies.json', import.meta.url);

// Loads the previous run's output (if any) and carries forward
// linkStatus/lastVerified by id, so a freshly re-parsed entry (which the
// parser always writes with default 'unknown'/null) doesn't lose history
// before the link-checker runs — see LLD §3.
async function mergePreviousLinkStatus(companies) {
  let previous;
  try {
    previous = JSON.parse(await readFile(COMPANIES_JSON_URL, 'utf-8'));
  } catch {
    return companies;
  }

  const byId = new Map(previous.companies.map((c) => [c.id, c]));
  return companies.map((company) => {
    const prev = byId.get(company.id);
    if (!prev) return company;
    return { ...company, linkStatus: prev.linkStatus, lastVerified: prev.lastVerified };
  });
}

async function main() {
  const res = await fetch(README_URL);
  if (!res.ok) {
    console.error(`Failed to fetch upstream README: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const markdown = await res.text();
  let companies = parseReadme(markdown);

  if (companies.length < MIN_COMPANIES) {
    console.error(
      `Sanity gate failed: parsed only ${companies.length} companies ` +
        `(minimum ${MIN_COMPANIES}). Aborting without publishing.`,
    );
    process.exit(1);
  }

  companies = companies.map((company) => ({
    ...company,
    tags: inferTags(company),
    salaryLinks: buildSalaryLinks(company.name),
  }));

  companies = await mergePreviousLinkStatus(companies);

  if (process.env.SKIP_LINK_CHECK === '1') {
    console.log('SKIP_LINK_CHECK=1 set — skipping link-check step.');
  } else {
    companies = await checkLinks(companies);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: SOURCE_URL,
    count: companies.length,
    companies,
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;

  await writeFile(COMPANIES_JSON_URL, json);
  await mkdir(new URL('../public/api/', import.meta.url), { recursive: true });
  await writeFile(new URL('../public/api/companies.json', import.meta.url), json);

  console.log(`Wrote ${companies.length} companies.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
