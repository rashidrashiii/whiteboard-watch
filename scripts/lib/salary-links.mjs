// Salary-lookup link generation. URL templates implemented exactly per
// wbw-artifacts/03-lld.md §5 — plain search-query URLs only, never scraped
// or hardcoded compensation data.

export function buildSalaryLinks(name) {
  const encoded = encodeURIComponent(name);
  return {
    levelsFyi: `https://www.levels.fyi/?search=${encoded}`,
    glassdoor: `https://www.glassdoor.com/Search/results.htm?keyword=${encoded}`,
  };
}
