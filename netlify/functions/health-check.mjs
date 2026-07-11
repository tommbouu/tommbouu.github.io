// AutoLawn UK — daily scheduled health check (see netlify.toml: @daily, UTC).
// Short orchestration only: verifies the homepage, sitemap, key money pages and
// priority affiliate endpoints respond, then logs one structured JSON report to
// the Netlify function logs. It never modifies the site and never triggers builds.

const CHECKS = [
  { name: "homepage", url: "https://autolawnuk.com/", expect: [200] },
  { name: "sitemap", url: "https://autolawnuk.com/sitemap.xml", expect: [200] },
  { name: "recommended", url: "https://autolawnuk.com/recommended-robot-mowers/", expect: [200] },
  { name: "wire-free-pillar", url: "https://autolawnuk.com/best-wire-free-robot-lawn-mower-uk/", expect: [200] },
  { name: "mower-finder", url: "https://autolawnuk.com/tools/", expect: [200] },
  { name: "newsletter-endpoint", url: "https://autolawnuk.com/api/subscribe", method: "POST", body: '{"email":""}', expect: [400, 503] }, // 400/503 = alive; 404 = broken
  // Priority affiliate destinations — redirects (3xx) are the healthy response for tracking links.
  { name: "awin-navimow", url: "https://www.awin1.com/cread.php?awinmid=99151&awinaffid=2971983&ued=https%3A%2F%2Fuk.navimow.com%2F", expect: [200, 301, 302, 303, 307, 308], redirect: "manual" },
  { name: "amazon-ocumow", url: "https://www.amazon.co.uk/dp/B0B6G4K1M5?tag=autolawn-21", expect: [200, 301, 302, 303, 405, 503], redirect: "manual" }, // Amazon bot-guards HEAD/GET; any response beats DNS failure
];

async function runCheck(c) {
  const r = { name: c.name, ok: false, status: null };
  try {
    const res = await fetch(c.url, {
      method: c.method || "GET",
      body: c.body,
      redirect: c.redirect || "follow",
      headers: { "user-agent": "AutoLawnUK-HealthCheck/1.0 (+https://autolawnuk.com)" , ...(c.method === "POST" ? { "content-type": "application/json" } : {}) },
      signal: AbortSignal.timeout(8000),
    });
    r.status = res.status;
    r.ok = c.expect.includes(res.status);
  } catch (err) {
    r.error = String(err).slice(0, 120);
  }
  return r;
}

export default async () => {
  const started = new Date().toISOString();
  // Run all checks concurrently — the previous sequential loop (8 checks x 8s timeout)
  // could take up to 64s, risking Netlify's scheduled-function execution limit.
  // Concurrent execution bounds the whole job to ~8s (the slowest single check).
  const results = await Promise.all(CHECKS.map(runCheck));
  const failures = results.filter((r) => !r.ok);
  console.log(JSON.stringify({
    job: "health-check",
    started,
    finished: new Date().toISOString(),
    checked: results.length,
    failed: failures.length,
    results,
  }));
  // Failures surface in Netlify function logs; wire an external alert (email/Slack)
  // later via a webhook env var if desired — see docs/automation-runbook.md.
  return new Response(JSON.stringify({ ok: failures.length === 0, failed: failures.length }), {
    headers: { "content-type": "application/json" },
  });
};
