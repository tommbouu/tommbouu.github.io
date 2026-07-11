// AutoLawn UK — newsletter subscription endpoint (MailerLite).
// Secure server-side proxy: the MailerLite API key lives in Netlify env vars
// (MAILERLITE_API_KEY, MAILERLITE_GROUP_ID) and is never exposed to the browser.
//
// Behaviour:
// - POST only, JSON body { email, hp } (hp = honeypot, must be empty)
// - Validates + normalises email, caps payload size
// - Best-effort per-instance rate limiting (Netlify functions are ephemeral;
//   this is a speed bump, not a guarantee — the honeypot does most of the work)
// - Never logs full email addresses
// - If MailerLite is not configured, returns an honest 503 (no fake success)
// - Upserts safely: an existing subscriber gets a friendly "already subscribed"

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map(); // ip -> [timestamps]  (per-instance only)

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

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json", "cache-control": "no-store" },
});

export default async (req, context) => {
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed." });

  const apiKey = process.env.MAILERLITE_API_KEY;
  const groupId = process.env.MAILERLITE_GROUP_ID;
  if (!apiKey) {
    // Honest degradation — never fake a success.
    return json(503, { ok: false, error: "The newsletter isn't quite ready yet — please try again soon." });
  }

  const ip = context?.ip || req.headers.get("x-nf-client-connection-ip") || "unknown";
  if (rateLimited(ip)) return json(429, { ok: false, error: "Too many attempts — please try again in a minute." });

  let raw;
  try {
    raw = await req.text();
    if (raw.length > 1000) return json(413, { ok: false, error: "Request too large." });
  } catch {
    return json(400, { ok: false, error: "Invalid request." });
  }

  let body;
  try { body = JSON.parse(raw); } catch { return json(400, { ok: false, error: "Invalid request." }); }

  // Honeypot: bots fill every field. Real users never see this one.
  if (body.hp) return json(200, { ok: true, message: "Thanks — check your inbox to confirm." });

  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    return json(400, { ok: false, error: "Please enter a valid email address." });
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
        // (see docs/mailerlite-setup.md) — enable it there.
      }),
    });

    if (res.status === 200) {
      // MailerLite returns 200 when the subscriber already existed (upsert).
      console.log(JSON.stringify({ job: "subscribe", status: "already-subscribed", email: mask(email) }));
      return json(200, { ok: true, message: "You're already on the list — nothing more to do." });
    }
    if (res.status === 201) {
      console.log(JSON.stringify({ job: "subscribe", status: "created", email: mask(email) }));
      return json(200, { ok: true, message: "Thanks — you're subscribed. If confirmation is required, check your inbox." });
    }

    const detail = await res.text();
    console.error(JSON.stringify({ job: "subscribe", status: "mailerlite-error", code: res.status, detail: detail.slice(0, 300), email: mask(email) }));
    return json(502, { ok: false, error: "Subscription failed on our side — please try again later." });
  } catch (err) {
    console.error(JSON.stringify({ job: "subscribe", status: "exception", message: String(err).slice(0, 200) }));
    return json(502, { ok: false, error: "Subscription failed on our side — please try again later." });
  }
};

export const config = { path: "/api/subscribe" };
