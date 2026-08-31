import profile from "../content/profile.json" with { type: "json" };

/* ------------------------------------------------------------------ *
 * Config. Everything swappable lives here.
 * GROQ_API_KEY is the only required secret.
 * ------------------------------------------------------------------ */
const ENDPOINT = process.env.LLM_ENDPOINT || "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.LLM_MODEL || "openai/gpt-oss-20b";
const API_KEY = process.env.GROQ_API_KEY;

const MAX_QUESTION_CHARS = 400;
const RATE_LIMIT = { windowMs: 60_000, max: 12 };
const CACHE_TTL_MS = 60 * 60 * 1000;

/* ------------------------------------------------------------------ *
 * Context. Built once at cold start from the same profile.json the
 * page renders from, so the assistant can never describe a version of
 * Nishil that the site doesn't show.
 * ------------------------------------------------------------------ */
function buildContext(p) {
  const lines = [];

  lines.push(`NAME: ${p.identity.name}`);
  lines.push(`ROLE: ${p.identity.role}, based in ${p.identity.location}`);
  lines.push(`CONTACT: ${p.identity.email}`);
  lines.push(`STATUS: ${p.hero.status}`);
  lines.push("");

  lines.push("SUMMARY:");
  lines.push(p.hero.standfirst);
  lines.push("");

  lines.push("EXPERIENCE:");
  for (const job of p.experience) {
    lines.push(`- ${job.title}, ${job.company} (${job.start} to ${job.endLabel}), ${job.location}`);
    for (const pt of job.points) lines.push(`  * ${pt}`);
    lines.push(`  * Stack: ${job.stack.join(", ")}`);
  }
  lines.push("");

  lines.push("PROJECTS:");
  for (const w of p.work) {
    lines.push(`- ${w.name} — ${w.subtitle} (${w.context})`);
    for (const pt of w.points) lines.push(`  * ${pt}`);
    lines.push(`  * Stack: ${w.stack.join(", ")}`);
    if (w.proprietary) lines.push(`  * ${w.note}`);
  }
  lines.push("");

  lines.push("SKILLS:");
  for (const s of p.skills) lines.push(`- ${s.group}: ${s.items.join(", ")}`);
  lines.push("");

  lines.push("PUBLICATIONS:");
  for (const pub of p.publications) lines.push(`- "${pub.title}" (${pub.venue}, ${pub.kind})`);
  lines.push("");

  const e = p.education;
  lines.push(`EDUCATION: ${e.degree}, ${e.school}, ${e.location}, ${e.years}. ${e.detail}`);

  return lines.join("\n");
}

const CONTEXT = buildContext(profile);

const SYSTEM_PROMPT = `You answer questions about ${profile.identity.name} for visitors to his portfolio site. You speak about him in the third person, as a knowledgeable colleague would — direct, concrete, no salesmanship.

The block below is everything you know. It is your only source of truth.

<profile>
${CONTEXT}
</profile>

Rules:
1. Answer only from the profile block. If a question asks for something not in it — salary expectations, personal life, opinions he has not stated, specific metrics that are not written down — say plainly that it is not something you have, and suggest emailing him.
2. Never invent numbers, dates, employers, tools or achievements. Not being able to answer is always better than guessing.
3. Confidentiality: ${profile.assistant.confidentialityRule} If asked how D7 or the compliance platform works internally, give only what the profile block states and say the rest is not public.
4. Off-topic questions — general knowledge, coding help, current events, anything not about Nishil — get a short redirect, not an answer. Do not answer them even partially.
5. Two to four sentences. No bullet lists, no headings, no markdown.

Respond with a single JSON object and nothing else:
{"answer": string, "grounded": boolean, "refusal_reason": "off_topic" | "not_in_profile" | "confidential" | null}

Set grounded to true only when the answer comes from the profile block. Set it to false for redirects and for anything you could not answer, and give the matching refusal_reason.`;

/* ------------------------------------------------------------------ *
 * Cache + rate limit.
 * These live in module scope, so they persist for the life of a warm
 * serverless instance and reset on a cold start. That is fine for a
 * portfolio: the cache is an optimization, not a correctness
 * requirement, and the rate limit is a speed bump, not a security
 * control. Move both to Vercel KV if this ever needs to be strict.
 * ------------------------------------------------------------------ */
const cache = new Map();
const hits = new Map();

function normalize(q) {
  return q.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function rateLimited(ip) {
  const now = Date.now();
  const record = hits.get(ip) ?? { count: 0, resetAt: now + RATE_LIMIT.windowMs };
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + RATE_LIMIT.windowMs;
  }
  record.count += 1;
  hits.set(ip, record);
  return record.count > RATE_LIMIT.max;
}

function sweep() {
  const now = Date.now();
  for (const [k, v] of cache) if (now > v.expiresAt) cache.delete(k);
  for (const [k, v] of hits) if (now > v.resetAt + RATE_LIMIT.windowMs) hits.delete(k);
}

/* ------------------------------------------------------------------ *
 * Response parsing. The model is told to return JSON; assume it
 * sometimes won't, and degrade to a plain grounded answer rather than
 * showing the visitor an error.
 * ------------------------------------------------------------------ */
function parseModelOutput(raw) {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.answer === "string" && parsed.answer.trim()) {
      return {
        answer: parsed.answer.trim(),
        grounded: parsed.grounded !== false,
        refusal_reason: parsed.refusal_reason ?? null,
      };
    }
  } catch {
    /* fall through */
  }
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (typeof parsed.answer === "string" && parsed.answer.trim()) {
        return {
          answer: parsed.answer.trim(),
          grounded: parsed.grounded !== false,
          refusal_reason: parsed.refusal_reason ?? null,
        };
      }
    } catch {
      /* fall through */
    }
  }
  return { answer: cleaned, grounded: true, refusal_reason: null };
}

/* ------------------------------------------------------------------ */

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Send a POST request with a question." });
  }
  if (!API_KEY) {
    return res.status(500).json({
      error: "The assistant is not configured. GROQ_API_KEY is missing on the server.",
    });
  }

  const body = typeof req.body === "string" ? safeJson(req.body) : req.body;
  const question = typeof body?.question === "string" ? body.question.trim() : "";

  if (!question) {
    return res.status(400).json({ error: "Ask a question to get an answer." });
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return res.status(400).json({
      error: `Questions are limited to ${MAX_QUESTION_CHARS} characters. Try a shorter one.`,
    });
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (rateLimited(ip)) {
    return res.status(429).json({
      error: "That's a lot of questions in one minute. Give it a moment and try again.",
    });
  }

  sweep();

  const key = normalize(question);
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return res.status(200).json({ ...cached.payload, cached: true, latencyMs: 0 });
  }

  const startedAt = Date.now();

  try {
    const upstream = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: question },
        ],
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error("Upstream error", upstream.status, detail.slice(0, 500));
      const message =
        upstream.status === 429
          ? "The assistant is over its rate limit right now. Try again shortly."
          : "The assistant could not reach the model. Try again in a moment.";
      return res.status(502).json({ error: message });
    }

    const data = await upstream.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    if (!raw) {
      return res.status(502).json({ error: "The model returned nothing. Try rephrasing." });
    }

    const payload = parseModelOutput(raw);
    payload.usage = {
      promptTokens: data?.usage?.prompt_tokens ?? null,
      completionTokens: data?.usage?.completion_tokens ?? null,
    };

    cache.set(key, { payload, expiresAt: Date.now() + CACHE_TTL_MS });

    return res.status(200).json({
      ...payload,
      cached: false,
      latencyMs: Date.now() - startedAt,
    });
  } catch (err) {
    console.error("Handler error", err);
    return res.status(500).json({ error: "Something broke on the way to the model. Try again." });
  }
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
