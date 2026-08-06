/**
 * CLocal waitlist robot
 * --------------------
 * 1) Save signup to waitlist_signups
 * 2) Best-effort upsert into CRM contacts (if that table exists)
 * 3) Send confirm email from hello@clocal.co.uk via Titan SMTP (123 Reg)
 *
 * Secrets (Supabase → Edge Functions → Secrets):
 *   TITAN_SMTP_HOST   default smtp.titan.email
 *   TITAN_SMTP_PORT   default 465
 *   TITAN_SMTP_USER   hello@clocal.co.uk
 *   TITAN_SMTP_PASS   mailbox password
 *   CLOCAL_MAIL_FROM  CLocal <hello@clocal.co.uk>
 *   CLOCAL_NOTIFY_TO  hello@clocal.co.uk  (optional admin ping)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const ALLOWED_ORIGINS = new Set([
  "https://clocal.co.uk",
  "https://www.clocal.co.uk",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/;
const ALLOWED_ROLES = new Set(["Consumer", "Creator", "Business"]);

type Body = {
  name?: unknown;
  email?: unknown;
  postcode?: unknown;
  roles?: unknown;
  newsletter?: unknown;
  _honey?: unknown;
};

function corsHeaders(origin: string | null): HeadersInit {
  const allow =
    origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://clocal.co.uk";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization, apikey",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(
  status: number,
  body: Record<string, unknown>,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
    },
  });
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizePostcode(value: string): string {
  const compact = value.toUpperCase().replace(/\s+/g, "");
  if (compact.length < 5) return compact;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

function inferRegion(postcode: string): string {
  const out = postcode.toUpperCase().replace(/\s+/g, "");
  if (out.startsWith("BT7") || out.startsWith("BT9")) return "south-belfast";
  if (out.startsWith("BT")) return "belfast";
  return "other";
}

function parseRoles(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const roles = v
    .filter((r): r is string => typeof r === "string")
    .map((r) => r.trim())
    .filter((r) => ALLOWED_ROLES.has(r));
  return [...new Set(roles)];
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const host = Deno.env.get("TITAN_SMTP_HOST") || "smtp.titan.email";
  const port = Number(Deno.env.get("TITAN_SMTP_PORT") || "465");
  const user = Deno.env.get("TITAN_SMTP_USER") || "";
  const pass = Deno.env.get("TITAN_SMTP_PASS") || "";
  const from =
    Deno.env.get("CLOCAL_MAIL_FROM") || "CLocal <hello@clocal.co.uk>";

  if (!user || !pass) {
    throw new Error("Mail is not set up yet. Missing Titan mailbox secrets.");
  }

  const client = new SMTPClient({
    connection: {
      hostname: host,
      port,
      tls: true,
      auth: { username: user, password: pass },
    },
  });

  try {
    await client.send({
      from,
      to: opts.to,
      subject: opts.subject,
      content: opts.text,
      html: opts.html,
    });
  } finally {
    await client.close();
  }
}

function confirmCopy(name: string): { subject: string; text: string; html: string } {
  const first = name.split(/\s+/)[0] || "there";
  const subject = "You’re on the CLocal waitlist";
  const text =
    `Hi ${first},\n\n` +
    `You’re on the CLocal waitlist. We’ll email you when your invite is ready.\n\n` +
    `Love local,\nCLocal\nhttps://clocal.co.uk\n`;
  const html =
    `<p>Hi ${escapeHtml(first)},</p>` +
    `<p>You’re on the <strong>CLocal</strong> waitlist. We’ll email you when your invite is ready.</p>` +
    `<p>Love local,<br/>CLocal<br/><a href="https://clocal.co.uk">clocal.co.uk</a></p>`;
  return { subject, text, html };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Use POST." }, origin);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json(400, { error: "Invalid JSON." }, origin);
  }

  // Honeypot: pretend success, do nothing.
  if (asString(body._honey)) {
    return json(200, { ok: true }, origin);
  }

  const name = asString(body.name);
  const email = asString(body.email).toLowerCase();
  const postcodeRaw = asString(body.postcode);
  const roles = parseRoles(body.roles);
  const newsletter =
    body.newsletter === true ||
    body.newsletter === "yes" ||
    body.newsletter === "true";

  if (!name || !email || !postcodeRaw || roles.length === 0) {
    return json(
      400,
      { error: "Please fill in name, email, postcode, and at least one role." },
      origin,
    );
  }

  if (!EMAIL_RE.test(email)) {
    return json(
      400,
      { error: "Please enter a real email address (like name@example.com)." },
      origin,
    );
  }

  if (!UK_POSTCODE_RE.test(postcodeRaw.toUpperCase().trim())) {
    return json(
      400,
      { error: "Please enter a UK postcode (e.g. BT7 1NN)." },
      origin,
    );
  }

  const postcode = normalizePostcode(postcodeRaw);
  const region = inferRegion(postcode);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return json(500, { error: "Server is not configured yet." }, origin);
  }

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const row = {
    name,
    email,
    postcode,
    roles,
    newsletter,
    source: "clocal-waitlist",
    region,
    confirm_email_status: "pending",
    confirm_email_error: null as string | null,
    raw: {
      user_agent: req.headers.get("user-agent"),
      origin,
    },
  };

  const { data: saved, error: saveError } = await sb
    .from("waitlist_signups")
    .upsert(row, { onConflict: "email" })
    .select("id")
    .maybeSingle();

  if (saveError) {
    console.error("waitlist save failed", saveError);
    // Temporary detail so we can finish setup; remove once stable.
    return json(
      500,
      {
        error: "Could not save your signup. Please try again.",
        detail: saveError.message,
        code: saveError.code ?? null,
      },
      origin,
    );
  }

  const signupId = saved?.id as string | undefined;

  // Best-effort CRM contacts sync (schema may vary; never fail the waitlist).
  try {
    const tags = ["clocal", "waitlist", ...roles.map((r) => r.toLowerCase())];
    if (newsletter) tags.push("newsletter");
    const notes = `postcode: ${postcode}; roles: ${roles.join(", ")}; newsletter: ${
      newsletter ? "yes" : "no"
    }`;
    const contactPayload = {
      name,
      email,
      source: "clocal-waitlist",
      tags,
      stage: "new",
      region,
      notes,
    };
    const { error: contactErr } = await sb.from("contacts").upsert(contactPayload, {
      onConflict: "email",
    });
    if (contactErr) {
      console.warn("contacts sync skipped:", contactErr.message);
    }
  } catch (err) {
    console.warn("contacts sync error", err);
  }

  let confirmStatus = "sent";
  let confirmError: string | null = null;
  try {
    const copy = confirmCopy(name);
    await sendMail({ to: email, ...copy });

    const notifyTo = Deno.env.get("CLOCAL_NOTIFY_TO") || "hello@clocal.co.uk";
    try {
      await sendMail({
        to: notifyTo,
        subject: `CLocal waitlist: ${name}`,
        text:
          `New waitlist signup\n\n` +
          `Name: ${name}\nEmail: ${email}\nPostcode: ${postcode}\n` +
          `Roles: ${roles.join(", ")}\nNewsletter: ${newsletter ? "yes" : "no"}\n` +
          `Region: ${region}\n`,
        html:
          `<p><strong>New waitlist signup</strong></p>` +
          `<ul>` +
          `<li>Name: ${escapeHtml(name)}</li>` +
          `<li>Email: ${escapeHtml(email)}</li>` +
          `<li>Postcode: ${escapeHtml(postcode)}</li>` +
          `<li>Roles: ${escapeHtml(roles.join(", "))}</li>` +
          `<li>Newsletter: ${newsletter ? "yes" : "no"}</li>` +
          `<li>Region: ${escapeHtml(region)}</li>` +
          `</ul>`,
      });
    } catch (notifyErr) {
      console.warn("admin notify failed", notifyErr);
    }
  } catch (err) {
    confirmStatus = "failed";
    confirmError = err instanceof Error ? err.message : String(err);
    console.error("confirm email failed", confirmError);
  }

  if (signupId) {
    await sb
      .from("waitlist_signups")
      .update({
        confirm_email_status: confirmStatus,
        confirm_email_error: confirmError,
      })
      .eq("id", signupId);
  }

  // Signup is saved even if mail failed — user still sees success.
  // During setup, surface mail status so we can fix Titan quickly.
  return json(
    200,
    {
      ok: true,
      mail: confirmStatus,
      mailError: confirmError,
    },
    origin,
  );
});
