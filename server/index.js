import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import webpush from "web-push";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const envAtRepoRoot = path.resolve(serverDir, "../.env");
const envAtCwd = path.resolve(process.cwd(), ".env");

/** Trim; strip wrapping quotes from editors that save `"sk-ant-..."`. */
function normalizeApiKey(raw) {
  let s = String(raw ?? "").trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function loadEnvFiles() {
  // override: true so a bad ANTHROPIC_API_KEY exported in the shell does not hide your .env file.
  if (fs.existsSync(envAtRepoRoot)) {
    dotenv.config({ path: envAtRepoRoot, override: true });
  }
  let key = normalizeApiKey(process.env.ANTHROPIC_API_KEY);
  if (!key && fs.existsSync(envAtCwd) && path.resolve(envAtCwd) !== path.resolve(envAtRepoRoot)) {
    dotenv.config({ path: envAtCwd, override: true });
    key = normalizeApiKey(process.env.ANTHROPIC_API_KEY);
  }
  if (!key && !fs.existsSync(envAtRepoRoot) && fs.existsSync(envAtCwd)) {
    dotenv.config({ path: envAtCwd, override: true });
    key = normalizeApiKey(process.env.ANTHROPIC_API_KEY);
  }
  return key;
}

const apiKey = loadEnvFiles();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

const isProd = process.env.NODE_ENV === "production";
const clientDist = path.resolve(serverDir, "../client/dist");

const anthropic = new Anthropic({ apiKey });

// Web Push setup
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const vapidReady = VAPID_PUBLIC && VAPID_PRIVATE && !VAPID_PUBLIC.includes("=");
if (vapidReady) {
  try {
    webpush.setVapidDetails(`mailto:${process.env.VAPID_CONTACT_EMAIL || "admin@example.com"}`, VAPID_PUBLIC, VAPID_PRIVATE);
  } catch (e) {
    console.warn("[push] Invalid VAPID keys — push notifications disabled:", e.message);
  }
}

// In-memory subscription store: endpoint → { subscription, reminderTime "HH:MM" }
const pushSubscriptions = new Map();

// Every minute, check if any subscriber's reminder time matches now
setInterval(() => {
  if (!vapidReady) return;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  for (const [endpoint, { subscription, reminderTime }] of pushSubscriptions) {
    if (reminderTime !== hhmm) continue;
    webpush
      .sendNotification(
        subscription,
        JSON.stringify({
          title: "Articulate",
          body: "Your daily reading practice is waiting. Open and read.",
        })
      )
      .catch((err) => {
        if (err.statusCode === 410) pushSubscriptions.delete(endpoint); // gone
        else console.error("[push]", err.message);
      });
  }
}, 60_000);

const THEMES = [
  "Executive communication",
  "AI & tech fluency",
  "Confidence & presence",
  "Managing upwards",
  "Storytelling with data",
  "Technical leadership",
  "Strategic thinking",
  "Influencing without authority",
  "Pitching & persuasion",
];

function pivotBlock(currentRole, targetRole) {
  if (!targetRole) return "";
  const isSales = /sales|account exec|\bae\b|\bsdr\b|\bbdr\b|business development|customer success|solutions? (engineer|consult)/i.test(targetRole);
  const salesLines = isSales
    ? `
- Write it as something a strong ${targetRole} in tech would actually say out loud: a pitch, a discovery call opener, a talk track for handling an objection, or a pep talk to their team before a quarter close.
- Use real tech sales vocabulary naturally, never as a glossary: discovery, pain, business case, champion, decision maker, pipeline, next steps, ROI, time to value. Show the buyer's problem first, the product second.
- Model good sales habits in the text: asking sharp questions, quantifying impact, naming a clear next step, and confident language with no hedging ("I just wanted to", "sort of", "maybe").`
    : "";
  return `
CAREER PIVOT: This person is moving from ${currentRole} into ${targetRole}. The passage should train them to sound like an experienced ${targetRole}: the vocabulary, the rhythm, the confidence. Where it fits, show how experience from ${currentRole} becomes an advantage in ${targetRole}.${salesLines}`;
}

/** Calls Claude and parses a single JSON object from the reply. Throws { status, message } on failure. */
async function askClaudeForJSON({ system, userMessage, maxTokens }) {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userMessage }],
  });
  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock) throw Object.assign(new Error("Unexpected model response."), { status: 502 });
  let raw = textBlock.text.trim();
  if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error("Model returned non-JSON. Try again."), { status: 502 });
  }
}

function sendError(res, err, fallback) {
  console.error(err);
  const status = err.status || 500;
  return res.status(status >= 400 && status < 600 ? status : 500).json({ error: err.message || fallback });
}

function lengthBlock(minutes) {
  const m = Number(minutes) || 4;
  if (m <= 2) {
    return `Target read-aloud time: about 2 minutes. Aim for 250–320 words. Keep it tight — every sentence should earn its place.`;
  }
  if (m <= 4) {
    return `Target read-aloud time: about 4 minutes. Aim for 450–560 words across 4–5 paragraphs. Give each paragraph one clear idea.`;
  }
  return `Target read-aloud time: about 6 minutes. Aim for 700–850 words. Build a real arc — setup, development, a turn, a landing.`;
}

function buildSystemPrompt({
  role,
  industry,
  goals,
  topics,
  inspirations,
  mood,
  theme,
  targetReadMinutes,
  dyslexiaMode,
  targetRole,
}) {
  const topicsStr = Array.isArray(topics) ? topics.join(", ") : String(topics || "");
  const inspirationList = Array.isArray(inspirations) && inspirations.length > 0
    ? inspirations : ["Codie Sanchez", "Bahja Abdi"];
  const r = role || "Professional";
  const ind = industry || "their field";
  const g = goals || "Not specified";
  const t = topicsStr || "Not specified";
  const moodLine = mood || "balanced";
  const th = theme || "Surprise me";
  const len = lengthBlock(targetReadMinutes);

  const dyslexiaBlock = dyslexiaMode
    ? `\nDYSLEXIA-FRIENDLY MODE: This reader benefits from clear, unambiguous text. Apply these rules strictly:
- Sentences: 10 to 15 words each. One idea per sentence. No comma-joined compound sentences.
- Paragraphs: 2 to 3 sentences only. More breaks, more white space.
- Vocabulary: plain, familiar words. Avoid homophones where possible (there/their, to/too/two). Avoid words that rely on b/d/p/q distinction.
- No nested clauses or parenthetical asides.
- Keep the same quality, insight, and interest — just make every sentence immediately clear on the first read.`
    : "";

  return `You are a speechwriter and voice coach creating a daily read-aloud passage for articulation practice. Your writing should be genuinely interesting to read — not corporate filler.

${len}
${dyslexiaBlock}
WHO THIS IS FOR: ${r} working in ${ind}. Their goal: ${g}. Topics they care about: ${t}.
Today's energy: ${moodLine}. Theme: ${th}.
${pivotBlock(r, targetRole)}

SPEAKING INSPIRATIONS: ${inspirationList.join(", ")}
Study how these speakers communicate and channel their energy. Consider their rhythm, directness, storytelling style, and the way they make ideas feel immediate and personal.

WRITING STYLE — follow these rules strictly:
- Write in the spirit of the speaking inspirations above: direct, engaging, authentic. Not an academic journal. Not corporate speak.
- Vary sentence length dramatically. Short sentences punch. Then a longer sentence builds momentum and carries the listener forward. Then something short again. Mix them freely — this is what makes speech feel alive.
- Concrete over abstract. Specific examples, real scenarios, vivid details. Banned words: leverage, synergy, paradigm, robust, utilise, impactful, deliverables. No em dashes in the text.
- Rhetorical questions are good. Contrast is good ("Most people do X. The few who win do Y."). A surprising observation is great.
- Write FOR THE VOICE: crisp consonants, natural commas that invite breath, words that feel satisfying to pronounce. Avoid run-on phrases that blur into each other.
- Modern English. Conversational but confident. No archaic phrasing, no stiff formality.

ARTICULATION FOCUS for the focusTip: one short, specific tip on HOW to say this passage. Max 12 words. No em dashes. Example: "Slow down on the final word of each sentence."

Return as JSON: { title, sourceLabel, passageText, focusTip, readTimeMinutes }

Respond with only a single JSON object (no markdown code fences, no commentary). Use "\\n\\n" between paragraphs in passageText. sourceLabel should be short and real-sounding (e.g. "Original · Articulate Daily"). readTimeMinutes should match the target (approximately ${Number(targetReadMinutes) || 4}).`;
}

app.post("/api/generate-passage", async (req, res) => {
  if (!apiKey) {
    return res.status(500).json({
      error: "Server misconfiguration: ANTHROPIC_API_KEY is not set.",
    });
  }

  const {
    name,
    role,
    industry,
    goals,
    topics,
    inspirations,
    mood,
    theme: requestedTheme,
    surprise,
    targetReadMinutes: rawMinutes,
    dyslexiaMode,
    targetRole,
  } = req.body || {};

  const targetReadMinutes =
    typeof rawMinutes === "number" && rawMinutes > 0 ? rawMinutes : 4;

  let theme = requestedTheme;
  if (surprise || !theme || theme === "Surprise me") {
    theme = THEMES[Math.floor(Math.random() * THEMES.length)];
  }

  const system = buildSystemPrompt({
    role: role || name,
    industry,
    goals,
    topics,
    inspirations,
    mood,
    theme,
    targetReadMinutes,
    dyslexiaMode: Boolean(dyslexiaMode),
    targetRole: typeof targetRole === "string" ? targetRole.trim() : "",
  });

  const userMessage = `Generate today's passage. Theme to emphasise: ${theme}.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return res.status(502).json({ error: "Unexpected model response shape." });
    }

    let raw = textBlock.text.trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(502).json({
        error: "Model returned non-JSON. Try again.",
        rawPreview: raw.slice(0, 200),
      });
    }

    const {
      title,
      sourceLabel,
      passageText,
      focusTip,
      readTimeMinutes,
    } = parsed;

    if (!title || !passageText) {
      return res.status(502).json({ error: "Incomplete passage payload from model." });
    }

    return res.json({
      title: String(title),
      sourceLabel: sourceLabel ? String(sourceLabel) : "Adapted · Editorial",
      passageText: String(passageText),
      focusTip: focusTip ? String(focusTip) : "Pause briefly at every full stop.",
      readTimeMinutes:
        typeof readTimeMinutes === "number" && readTimeMinutes > 0
          ? readTimeMinutes
          : targetReadMinutes,
      theme,
    });
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    if (status === 401) {
      return res.status(401).json({
        error:
          "Anthropic rejected the API key (401). Create a new key at https://console.anthropic.com/settings/keys — it must start with sk-ant- and be the full string on one line in Articulate/.env as ANTHROPIC_API_KEY=... Then restart npm run dev.",
      });
    }
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      error: err.message || "Passage generation failed.",
    });
  }
});

app.post("/api/score-speech", async (req, res) => {
  if (!apiKey) {
    return res.status(500).json({ error: "Server misconfiguration: ANTHROPIC_API_KEY is not set." });
  }

  const { passageText, transcript, durationSeconds, expectedMinutes } = req.body || {};

  if (!passageText || !transcript) {
    return res.status(400).json({ error: "passageText and transcript are required." });
  }

  const expectedSecs = Math.round((Number(expectedMinutes) || 4) * 60);
  const actualSecs = Math.round(Number(durationSeconds) || 0);

  const userMessage = `Score how well this person read the passage aloud for professional articulation practice.

ORIGINAL PASSAGE:
"""
${passageText}
"""

THEIR TRANSCRIPT (speech-to-text):
"""
${transcript}
"""

${actualSecs > 0 ? `Recording duration: ${actualSecs} seconds\nExpected read time: ~${expectedSecs} seconds (~${expectedMinutes} min)` : ""}

Score each dimension 1–10 and give specific, constructive feedback:

- accuracy: How closely did they follow the text? Missed words, substitutions, skipped sentences count against this.
- fluency: How smooth was the delivery? Repeated words, filler words (um, uh, er), false starts count against this.
- pace: How appropriate was the speed?${actualSecs > 0 ? ` They took ${actualSecs}s vs expected ~${expectedSecs}s. Within 20% = high score, significantly faster or slower = lower score.` : " Judge from transcript flow."}
- overall: Holistic score.

Respond with ONLY this JSON (no markdown, no commentary):
{
  "scores": { "accuracy": <1-10>, "fluency": <1-10>, "pace": <1-10>, "overall": <1-10> },
  "feedback": {
    "accuracy": "<1-2 specific sentences>",
    "fluency": "<1-2 specific sentences>",
    "pace": "<1-2 specific sentences>",
    "summary": "<2-3 sentence overall summary with the single most important thing to work on next>"
  }
}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: "You are a speech coach evaluating a professional reading a passage aloud. Be encouraging but honest and specific.",
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock) return res.status(502).json({ error: "Unexpected model response." });

    let raw = textBlock.text.trim();
    if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(502).json({ error: "Model returned non-JSON.", rawPreview: raw.slice(0, 200) });
    }

    const { scores, feedback } = parsed;
    if (!scores || !feedback) return res.status(502).json({ error: "Incomplete score payload." });

    return res.json({ scores, feedback });
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      error: err.message || "Scoring failed.",
    });
  }
});

/** Trimmed string capped at `max` chars, or `fallback` when missing/empty. */
function clip(value, max, fallback = "") {
  const s = typeof value === "string" ? value.trim().slice(0, max) : "";
  return s || fallback;
}

function readPitchContext(body) {
  return {
    goalLabel: clip(body.goalLabel, 80, "a client-facing role"),
    audienceLabel: clip(body.audienceLabel, 80, "a senior stakeholder"),
    audienceStyle: clip(body.audienceStyle, 300),
  };
}

app.post("/api/generate-pitch", async (req, res) => {
  if (!apiKey) {
    return res.status(500).json({ error: "Server misconfiguration: ANTHROPIC_API_KEY is not set." });
  }

  const body = req.body || {};
  const { goalLabel, audienceLabel, audienceStyle } = readPitchContext(body);
  const role = clip(body.role, 80, "a professional");
  const industry = clip(body.industry, 80, "their field");
  const type = clip(body.scenarioType, 80, "Short spoken update");
  const brief = clip(body.scenarioBrief, 300);
  const context = clip(body.context, 500);

  const system = `You are an expert communication coach for people stepping into ${goalLabel}. You design realistic role-play scenarios that feel like a real day in that job.`;

  const userMessage = `Create one practice scenario.

LEARNER: Currently ${role} in ${industry}, practising for ${goalLabel}.
SCENARIO TYPE: ${type}${brief ? ` — ${brief}` : ""}
AUDIENCE: ${audienceLabel}${audienceStyle ? ` — ${audienceStyle}` : ""}
CONTEXT: ${context || "None given. Invent believable specifics, with fictional company and people names (not famous brands)."}

Rules:
- The "buyer" field is the person the learner is speaking to, and they must be this audience: ${audienceLabel}. Give them a realistic name, job title, and (fictional) organisation, plus a specific situation with numbers where it helps.
- "product" is what the learner is offering, owns, or is responsible for in this moment: a product, a fix, a proposal, or a plan.
- beats are the 3 to 4 moves the learner should hit, in order, written as short instructions.
- phrasesToTry are 3 short, natural lines someone experienced in ${goalLabel} would actually say to this person. Not cheesy, not scripted-sounding.
- likelyObjection is one realistic pushback or tough question the other person would raise.
- If the learner's current background gives them credibility with the other person, mention how to use it in "yourEdge". Otherwise give a general confidence tip.
- Pitch the level of detail and tone to the audience.
- No em dashes.

Respond with ONLY this JSON (no markdown, no commentary):
{
  "title": "<short title>",
  "scenarioType": "${type}",
  "buyer": { "name": "<first and last name>", "title": "<job title>", "company": "<organisation>", "companyDescription": "<one line>" },
  "situation": "<2-3 sentences setting the scene>",
  "product": "<one line: what the learner offers or is responsible for here>",
  "goal": "<one line: what success looks like>",
  "likelyObjection": "<one line>",
  "beats": ["<beat>", "<beat>", "<beat>"],
  "phrasesToTry": ["<phrase>", "<phrase>", "<phrase>"],
  "yourEdge": "<one sentence>",
  "timeLimitSeconds": <45-120>
}`;

  try {
    const scenario = await askClaudeForJSON({ system, userMessage, maxTokens: 2048 });
    if (!scenario.title || !scenario.buyer || !scenario.situation) {
      return res.status(502).json({ error: "Incomplete scenario payload from model." });
    }
    return res.json({ ...scenario, scenarioType: type });
  } catch (err) {
    return sendError(res, err, "Scenario generation failed.");
  }
});

app.post("/api/score-pitch", async (req, res) => {
  if (!apiKey) {
    return res.status(500).json({ error: "Server misconfiguration: ANTHROPIC_API_KEY is not set." });
  }

  const body = req.body || {};
  const { scenario, transcript, durationSeconds } = body;
  if (!scenario || typeof scenario !== "object" || typeof transcript !== "string" || !transcript.trim()) {
    return res.status(400).json({ error: "scenario and transcript are required." });
  }

  const { goalLabel, audienceLabel, audienceStyle } = readPitchContext(body);
  const actualSecs = Math.round(Number(durationSeconds) || 0);

  const userMessage = `Someone stepping into ${goalLabel} just delivered this out loud to ${audienceLabel} in a role-play. Coach them.

SCENARIO:
${JSON.stringify(scenario, null, 2)}

WHAT THEY SAID (speech-to-text, so ignore punctuation and small transcription errors):
"""
${transcript}
"""
${actualSecs > 0 ? `\nThey spoke for ${actualSecs}s. Target was about ${scenario.timeLimitSeconds || 60}s.` : ""}

Score each dimension 1–10:
- structure: Did they hit the beats in order and finish with a clear ask or next step?
- valueFocus: Did they lead with what matters to ${audienceLabel}, rather than internal detail?
- salesLanguage: Do they sound like a seasoned ${goalLabel}? The vocabulary and rhythm of the role.
- confidence: Filler words, hedging ("I just wanted to", "sort of", "maybe", "sorry"), rambling, and length vs the target all count against this.
- overall: Holistic. Would this land with ${audienceLabel}?

Judge whether the level of detail and tone fit ${audienceLabel}${audienceStyle ? ` (${audienceStyle})` : ""}. Too much technical detail for an exec, or too vague for an engineer, should cost points and be named in feedback.

Then:
- swaps: up to 3 things they actually said that weakened them, each with a stronger alternative. Quote them closely. If nothing weak, return an empty array.
- strongerVersion: rewrite it as a seasoned ${goalLabel} would say it to ${audienceLabel}, about 80–130 words, keeping their ideas and facts. Written for the voice, so they can read it aloud to practise. No em dashes.

Respond with ONLY this JSON (no markdown, no commentary):
{
  "scores": { "structure": <1-10>, "valueFocus": <1-10>, "salesLanguage": <1-10>, "confidence": <1-10>, "overall": <1-10> },
  "feedback": {
    "structure": "<1-2 specific sentences>",
    "valueFocus": "<1-2 specific sentences>",
    "salesLanguage": "<1-2 specific sentences>",
    "confidence": "<1-2 specific sentences>",
    "summary": "<2-3 sentences with the single most important thing to work on next>"
  },
  "swaps": [{ "from": "<what they said>", "to": "<stronger line>" }],
  "strongerVersion": "<text>"
}`;

  try {
    const parsed = await askClaudeForJSON({
      system: "You are a communication coach who helps people sound like seasoned professionals in a new role. Be encouraging but honest, specific, and practical.",
      userMessage,
      maxTokens: 2048,
    });
    const { scores, feedback, swaps, strongerVersion } = parsed;
    if (!scores || !feedback) return res.status(502).json({ error: "Incomplete score payload." });
    return res.json({
      scores,
      feedback,
      swaps: Array.isArray(swaps) ? swaps.slice(0, 3) : [],
      strongerVersion: strongerVersion ? String(strongerVersion) : "",
    });
  } catch (err) {
    return sendError(res, err, "Pitch scoring failed.");
  }
});

app.post("/api/push/subscribe", (req, res) => {
  const { subscription, reminderTime } = req.body || {};
  if (!subscription?.endpoint) return res.status(400).json({ error: "Invalid subscription." });
  const time = typeof reminderTime === "string" && /^\d{2}:\d{2}$/.test(reminderTime)
    ? reminderTime : "08:00";
  pushSubscriptions.set(subscription.endpoint, { subscription, reminderTime: time });
  res.json({ ok: true, reminderTime: time });
});

app.post("/api/push/unsubscribe", (req, res) => {
  const { endpoint } = req.body || {};
  if (endpoint) pushSubscriptions.delete(endpoint);
  res.json({ ok: true });
});

app.get("/api/health", (_req, res) => {
  const looksAnthropic = apiKey.startsWith("sk-ant-") && apiKey.length > 40;
  res.json({
    ok: true,
    anthropicKeyLoaded: Boolean(apiKey),
    anthropicKeyLength: apiKey.length,
    anthropicKeyLooksFormatted: looksAnthropic,
    envFilesChecked: [envAtRepoRoot, envAtCwd].filter((p) => fs.existsSync(p)),
  });
});

if (isProd) {
  if (!fs.existsSync(clientDist)) {
    console.error(
      `[Articulate] Missing client build at ${clientDist}. Run: npm run build (from repo root) before NODE_ENV=production.`
    );
  }
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"), (err) => {
      if (err) next(err);
    });
  });
} else {
  app.get("/", (_req, res) => {
    res.type("text").send(
      "Articulate API only (dev). Open the React app at http://localhost:5173 while `npm run dev` is running."
    );
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Articulate listening on port ${PORT}${isProd ? " (production: API + static client)" : " (API only; use Vite on 5173)"}`);
  if (!apiKey) {
    console.warn(
      `[Articulate] No ANTHROPIC_API_KEY. Set it in the environment (or ${envAtRepoRoot}) and restart.`
    );
  } else {
    const ok = apiKey.startsWith("sk-ant-") && apiKey.length > 40;
    console.log(
      `[Articulate] ANTHROPIC_API_KEY loaded (${apiKey.length} chars)${ok ? "" : " — WARNING: key should be long and start with sk-ant- (from console.anthropic.com)"}`
    );
  }
});
