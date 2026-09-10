// Parser for the upstream poteto/hiring-without-whiteboards README.
// Rules implemented exactly per wbw-artifacts/03-lld.md §2 — do not
// improvise alternate regexes or splitting logic here.

const SECTION_HEADER_RE = /^##\s+([0-9A-Z](?:\s*-\s*[0-9A-Z])?)\s*$/;
const ENTRY_RE = /^-\s*\[([^\]]+)\]\(([^)]+)\)(.*)$/;

export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeSection(raw) {
  return raw.replace(/\s*-\s*/, '–');
}

export function parseReadme(markdown) {
  const lines = markdown.split(/\r?\n/);
  const companies = [];
  let section = null;

  for (const line of lines) {
    const sectionMatch = line.match(SECTION_HEADER_RE);
    if (sectionMatch) {
      section = normalizeSection(sectionMatch[1]);
      continue;
    }

    if (section === null) continue;

    const entryMatch = line.match(ENTRY_RE);
    if (!entryMatch) continue;

    const [, name, url, restRaw] = entryMatch;
    if (!name || !url.startsWith('http')) continue;

    const cleaned = restRaw.trim().replace(/^\|\s*/, '');
    const segments = cleaned.split(/\s*\|\s*/);
    const location = segments[0] ?? '';
    const description = segments.length > 1 ? segments.slice(1).join(' | ') : '';

    companies.push({
      id: slugify(name),
      name,
      url,
      location,
      description,
      section,
      tags: [],
      salaryLinks: {
        levelsFyi: '',
        glassdoor: '',
      },
      linkStatus: 'unknown',
      lastVerified: null,
    });
  }

  return companies;
}
