// AutoLawn UK — newsletter subscription endpoint (MailerLite).
// Secure server-side proxy: the MailerLite API key lives in Netlify env vars
// (MAILERLITE_API_KEY, MAILERLITE_GROUP_ID) and is never exposed to the browser.
//
// Behaviour:
// - POST only, accepts JSON {email,hp} OR application/x-www-form-urlencoded
//   (the latter is what a browser sends if JavaScript fails — see docs/mailerlite-setup.md)
// - Validates + normalises email, caps payload size
// - Best-effort per-instance rate limiting (Netlify functions are ephemeral;
//   this is a speed bump, not a guarantee — the honeypot does most of the work)
// - Never logs full email addresses
// - If MailerLite is not configured, returns an honest 503 (no fake success)
// - Upserts safely via MailerLite's own upsert semantics: an existing subscriber
//   gets a friendly "already subscribed" rather than a duplicate record
// - Responds with JSON for fetch()/XHR callers, or a minimal accessible HTML
//   page for a plain (non-JS) form navigation — detected via Accept header

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map(); // ip -> [timestamps]  (per-instance only; see docs/automation-runbook.md)

function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 500) hits.clear(); // bound memory
  return arr.length > MAX_PER_WINDOW;
}

function mask(email) {
  const [user, domain] = String(email).split("@");
  return `${(user || "").slice(0, 2)}***@${domain || "?"}`;
}

function wantsHtml(req) {
  const accept = req.headers.get("accept") || "";
  const ct = req.headers.get("content-type") || "";
  // A plain HTML form (no JS) navigates the browser and sends
  // application/x-www-form-urlencoded with Accept: text/html,...
  return ct.includes("application/x-www-form-urlencoded") || accept.includes("text/html");
}

function htmlPage(title, message, ok) {
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title} | AutoLawn UK</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:520px;margin:15vh auto;padding:0 20px;color:#1c2530;text-align:center}
.icon{font-size:2.5rem}h1{font-size:1.4rem}a{color:#1a7f4b;font-weight:600}
.box{border:1px solid #e3e8ec;border-radius:10px;padding:28px 24px;background:${ok ? "#f2faf5" : "#fdf6f0"}}</style></head>
<body><div class="box"><p class="icon" aria-hidden="true">${ok ? "✅" : "⚠️"}</p><h1>${title}</h1><p>${message}</p><p><a href="/">← Back to AutoLawn UK</a></p></div></body></html>`;
}

function respond(req, status, body, htmlTitle) {
  if (wantsHtml(req)) {
    return new Response(htmlPage(htmlTitle, body.error || body.message, body.ok), {
      status,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function parseBody(req) {
  const ct = req.headers.get("content-type") || "";
  const raw = await req.text();
  if (raw.length > 1000) throw new Error("too-large");
  if (ct.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(raw);
    return { email: params.get("email") || "", hp: params.get("hp") || "" };
  }
  // Default: JSON (also tolerate missing/blank content-type as JSON, the fetch() default)
  return JSON.parse(raw || "{}");
}

export default async (req, context) => {
  if (req.method !== "POST") {
    return respond(req, 405, { ok: false, error: "This endpoint only accepts subscription submissions." }, "Method not allowed");
  }

  const apiKey = process.env.MAILERLITE_API_KEY;
  const groupId = process.env.MAILERLITE_GROUP_ID;
  if (!apiKey) {
    // Honest degradation — never fake a success.
    return respond(req, 503, { ok: false, error: "The newsletter isn't quite ready yet — please try again soon." }, "Not ready yet");
  }

  const ip = context?.ip || req.headers.get("x-nf-client-connection-ip") || "unknown";
  if (rateLimited(ip)) return respond(req, 429, { ok: false, error: "Too many attempts — please try again in a minute." }, "Slow down");

  let body;
  try {
    body = await parseBody(req);
  } catch (e) {
    if (e.message === "too-large") return respond(req, 413, { ok: false, error: "Request too large." }, "Request too large");
    return respond(req, 400, { ok: false, error: "Invalid request." }, "Invalid request");
  }

  // Honeypot: bots fill every field. Real users never see this one (CSS-hidden).
  if (body.hp) return respond(req, 200, { ok: true, message: "Thanks — check your inbox to confirm." }, "Thanks");

  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    return respond(req, 400, { ok: false, error: "Please enter a valid email address." }, "Invalid email");
  }

  try {
    const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email,
        ...(groupId ? { groups: [groupId] } : {}),
        // Double opt-in is controlled account-wide in MailerLite settings
        // (Settings → Subscribe settings) — not a per-request parameter.
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 200) {
      // MailerLite returns 200 when the subscriber already existed (safe upsert, no duplicate).
      console.log(JSON.stringify({ job: "subscribe", status: "already-subscribed", email: mask(email) }));
      return respond(req, 200, { ok: true, message: "You're already on the list — nothing more to do." }, "Already subscribed");
    }
    if (res.status === 201) {
      console.log(JSON.stringify({ job: "subscribe", status: "created", email: mask(email) }));
      return respond(req, 200, { ok: true, message: "Thanks — you're subscribed. If confirmation is required, check your inbox." }, "Subscribed");
    }

    // Do not leak MailerLite's raw response body to the client — log a
    // truncated version server-side only, return a generic client message.
    const detail = await res.text();
    console.error(JSON.stringify({ job: "subscribe", status: "mailerlite-error", code: res.status, detail: detail.slice(0, 300), email: mask(email) }));
    return respond(req, 502, { ok: false, error: "Subscription failed on our side — please try again later." }, "Something went wrong");
  } catch (err) {
    const isTimeout = err?.name === "TimeoutError" || err?.name === "AbortError";
    console.error(JSON.stringify({ job: "subscribe", status: isTimeout ? "timeout" : "exception", message: String(err).slice(0, 200) }));
    return respond(req, 502, { ok: false, error: "Subscription failed on our side — please try again later." }, "Something went wrong");
  }
};

export const config = { path: "/api/subscribe" };
