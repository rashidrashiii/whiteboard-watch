// Link-checker for company URLs. Rules implemented exactly per
// wbw-artifacts/03-lld.md §3 — do not improvise alternate concurrency,
// timeout, or fallback behavior here.

const CONCURRENCY = 15;
const TIMEOUT_MS = 8000;
const USER_AGENT = 'WhiteboardWatch-LinkChecker/1.0 (+https://whiteboardwatch.dev)';

async function attempt(fetchImpl, url, method, timeoutMs, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { method, signal: controller.signal, headers });
  } finally {
    clearTimeout(timer);
  }
}

async function isLinkOk(fetchImpl, url, timeoutMs) {
  try {
    let res = await attempt(fetchImpl, url, 'HEAD', timeoutMs);
    if (res.status === 403 || res.status === 405) {
      res = await attempt(fetchImpl, url, 'GET', timeoutMs, {
        Range: 'bytes=0-512',
        'User-Agent': USER_AGENT,
      });
    }
    return res.ok || (res.status >= 300 && res.status < 400);
  } catch {
    return false;
  }
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

// Checks every company's `url` with a concurrency-limited worker pool and
// returns a new array with `linkStatus`/`lastVerified` updated. On failure,
// `lastVerified` is carried forward unchanged from the input company —
// never cleared.
export async function checkLinks(companies, options = {}) {
  const {
    concurrency = CONCURRENCY,
    timeoutMs = TIMEOUT_MS,
    fetchImpl = fetch,
  } = options;

  const results = companies.map((company) => ({ ...company }));
  const today = todayUtc();

  let nextIndex = 0;
  async function worker() {
    for (let i = nextIndex++; i < results.length; i = nextIndex++) {
      const company = results[i];
      const ok = await isLinkOk(fetchImpl, company.url, timeoutMs);
      if (ok) {
        company.linkStatus = 'ok';
        company.lastVerified = today;
      } else {
        company.linkStatus = 'broken';
      }
    }
  }

  const workerCount = Math.min(concurrency, results.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}
