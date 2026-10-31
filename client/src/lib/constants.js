/** Extended speaker list for autocomplete suggestions. */
export const ALL_SPEAKERS = [
  // Business & leadership
  "Satya Nadella", "Sheryl Sandberg", "Indra Nooyi", "Tim Cook", "Mary Barra",
  "Reed Hastings", "Jamie Dimon", "Oprah Winfrey", "Howard Schultz", "Anne Morriss",
  "Patty McCord", "Kim Scott", "Liz Wiseman", "Roger Martin", "A.G. Lafley",
  "Ray Dalio", "Sara Blakely", "Arianna Huffington", "Melinda Gates", "Jacinda Ardern",
  // Tech
  "Sam Altman", "Jensen Huang", "Sundar Pichai", "Mira Murati", "Daniela Amodei",
  "Mustafa Suleyman", "Demis Hassabis", "Fei-Fei Li", "Andrew Ng", "Anjali Sud",
  "Kelsey Hightower", "Charity Majors", "Kara Swisher",
  "Will Larson", "Patrick Collison", "Tobias Lütke", "Ev Williams", "Jessica Livingston",
  // Motivation & presence
  "Codie Sanchez", "Bahja Abdi", "Brené Brown", "Tony Robbins", "Amy Cuddy",
  "Emma Grede", "Robin Sharma", "Jay Shetty", "Lisa Nichols", "Mel Robbins", "Reshma Saujani",
  // Politics & public speaking
  "Barack Obama", "Michelle Obama", "Justin Trudeau", "Angela Merkel", "Nelson Mandela",
  "Hillary Clinton", "Kamala Harris", "Alexandria Ocasio-Cortez", "Malala Yousafzai",
  // Media & culture
  "Trevor Noah", "Oprah Winfrey", "Jon Stewart", "James Clear", "Steven Bartlett",
  "Diary of a CEO", "Niall Ferguson", "Yuval Noah Harari", "Thomas Friedman",
  // Influence & storytelling
  "Simon Sinek", "Adam Grant", "Malcolm Gladwell", "Brené Brown", "Daniel Pink",
  "Seth Godin", "Gary Vaynerchuk", "Robert Cialdini", "Jonah Berger", "Chip Heath",
  "Dan Heath", "Steven Levitt", "Hans Rosling", "Dan Roam", "Scott Galloway",
  // Career & management
  "Adam Grant", "Patty McCord", "Liz Wiseman", "Michael Bungay Stanier",
  "David Marquet", "Frances Frei", "Amy Edmondson", "Tomas Chamorro-Premuzic",
  // Sales & persuasion
  "Chris Voss", "Alex Hormozi", "Marc Benioff", "Jeb Blount", "Zig Ziglar",
].filter((v, i, a) => a.indexOf(v) === i); // deduplicate

/** Focus areas (onboarding chips + profile); used as passage themes. */
export const FOCUS_AREA_OPTIONS = [
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

/** Quick picks for "pivoting into" (onboarding + settings). Free text is also allowed. */
export const TARGET_ROLE_SUGGESTIONS = [
  "Tech sales (Account Executive)",
  "SDR / BDR",
  "Customer Success",
  "Solutions Engineering",
  "Product Management",
];

/**
 * Pitch practice: what you're practising for, who you're speaking to, and the scenarios.
 * `role` is the person you sound like ("a seasoned support engineer").
 * `match` maps profile.targetRole onto a goal for the first-visit default.
 * `style` is one line on how to talk to that audience; it's sent to the server prompts.
 */
export const PITCH_GOALS = [
  {
    id: "support",
    label: "Product Support",
    role: "support engineer",
    match: /support/i,
    audiences: [
      { id: "customer", label: "Customer", style: "Admin or day-to-day user. Practical and specific: what's happening, what to do now, when they'll hear next." },
      { id: "exec", label: "C-suite exec", style: "Customer CIO/CTO or senior leader. Bottom line first, business impact, risk and timeline in plain words, under 60 seconds, no jargon." },
      { id: "engineering", label: "Engineering lead", style: "Internal escalation. Impact, evidence, repro steps, a clear ask and priority." },
    ],
    scenarios: [
      { id: "P1 incident update", hint: "Status, impact, next update", brief: "A P1 incident is ongoing. Give a status update: what is happening, the impact, what happens next, and when they will hear from you." },
      { id: "Delivering bad news", hint: "Confirmed bug, no fix date yet", brief: "A bug is confirmed but there is no fix date yet. Deliver the news honestly and offer a workaround." },
      { id: "Calming a frustrated admin", hint: "Acknowledge, own it, give a plan", brief: "An admin is frustrated after repeated problems. Acknowledge it, take ownership, and give a clear plan." },
      { id: "Explaining a technical issue", hint: "e.g. an SSO/SCIM failure, in plain words", brief: "Explain a technical issue, such as an SSO or SCIM provisioning failure, to someone non-technical." },
      { id: "Escalating to engineering", hint: "Impact, evidence, ask", brief: "Escalate a customer issue to engineering with a crisp case: impact, evidence, repro steps, and a clear ask and priority.", defaultAudience: "engineering" },
      { id: "Closing out an incident", hint: "Recap, root cause, prevention", brief: "The incident is resolved. Recap what happened, explain the root cause in plain words, and say what prevents it happening again." },
    ],
  },
  {
    id: "leadership",
    label: "Speaking to leadership",
    role: "leader",
    match: /leadership/i,
    audiences: [
      { id: "manager", label: "Your manager", style: "Direct and candid. Lead with the headline, then what you need from them." },
      { id: "vp", label: "VP / C-suite", style: "Bottom line first. Business impact, options and a clear recommendation in under a minute." },
    ],
    scenarios: [
      { id: "60-second update to a VP", hint: "Headline, progress, risks, ask", brief: "Give a 60-second update on your area: the headline, progress, risks, and anything you need.", defaultAudience: "vp" },
      { id: "Flag a risk early", hint: "Name it, size it, propose a fix", brief: "Flag a risk before it becomes a problem: what it is, how big it could get, and what you propose." },
      { id: "Ask for budget or headcount", hint: "Make the business case", brief: "Ask for budget or headcount with a clear business case: the problem, the cost of doing nothing, and the return." },
      { id: "Handle a tough question from an exec", hint: "Stay calm, answer straight", brief: "An exec asks a pointed question about a miss or a delay. Answer directly, own it, and say what happens next.", defaultAudience: "vp" },
    ],
  },
  {
    id: "sales",
    label: "Tech sales (AE)",
    role: "account executive",
    match: /tech sales|account exec|\bae\b/i,
    audiences: [
      { id: "buyer", label: "Buyer", style: "Day-to-day decision maker. Their problem first, specific value, sharp questions, a clear next step." },
      { id: "economic", label: "Economic buyer (exec)", style: "Signs off the spend. ROI, risk and time to value in business terms. Brief and confident." },
    ],
    scenarios: [
      { id: "Elevator pitch", hint: "60 seconds with a senior buyer", brief: "A 60-second pitch to a senior buyer you meet by chance. Hook, problem, value, ask." },
      { id: "Cold call opener", hint: "Earn the next 5 minutes", brief: "The first 45 seconds of a cold call. Earn the right to keep talking and book a meeting." },
      { id: "Discovery call", hint: "Uncover pain and impact", brief: "Open a first meeting, set the agenda, and ask questions that uncover pain and impact." },
      { id: "Product demo", hint: "Tie the demo to their problem", brief: "Introduce a demo by tying it to the buyer's specific problems before showing anything." },
      { id: "Handling an objection", hint: "Acknowledge, explore, reframe", brief: "The buyer raises a hard objection. Acknowledge, explore, reframe, and move forward." },
      { id: "Closing next steps", hint: "Lock in a concrete next step", brief: "End a strong meeting by summarising value and securing a concrete next step." },
    ],
  },
  {
    id: "sdr",
    label: "SDR / BDR",
    role: "SDR",
    match: /\bsdr\b|\bbdr\b|business development/i,
    audiences: [
      { id: "prospect", label: "Prospect", style: "Busy and sceptical. Earn attention fast with a relevant reason for calling and a low-friction ask." },
      { id: "gatekeeper", label: "Gatekeeper", style: "Assistant or front desk. Polite, confident and brief; give them a good reason to put you through." },
    ],
    scenarios: [
      { id: "Cold call opener", hint: "Earn the next 5 minutes", brief: "The first 45 seconds of a cold call. Earn the right to keep talking and book a meeting." },
      { id: "Voicemail", hint: "Under 30 seconds, one reason to call back", brief: "Leave a voicemail under 30 seconds with one specific, relevant reason to call back." },
      { id: "Handling a brush-off objection", hint: "\"Just send me an email\"", brief: "The prospect tries to end the call with a brush-off like \"just send me an email\". Keep the door open without being pushy." },
    ],
  },
  {
    id: "cs",
    label: "Customer Success",
    role: "customer success manager",
    match: /customer success/i,
    audiences: [
      { id: "champion", label: "Customer champion", style: "Your day-to-day ally. Collaborative and specific; help them make the case internally." },
      { id: "exec", label: "Customer exec", style: "Cares about outcomes and ROI. Lead with results, keep it brief, make a clear recommendation." },
    ],
    scenarios: [
      { id: "Renewal at risk", hint: "Surface concerns, rebuild confidence", brief: "A renewal is at risk. Surface the real concerns, acknowledge them, and rebuild confidence with a plan." },
      { id: "QBR value recap", hint: "Results in their terms", brief: "Open a quarterly business review by recapping the value delivered in the customer's own terms.", defaultAudience: "exec" },
      { id: "Expansion ask", hint: "Tie growth to their goals", brief: "Propose expanding the account by tying it to the customer's goals and results so far." },
    ],
  },
  {
    id: "se",
    label: "Solutions Engineering",
    role: "solutions engineer",
    match: /solutions? (engineer|consult|architect)/i,
    audiences: [
      { id: "technical", label: "Technical buyer", style: "Wants depth and proof. Precise, honest about limits, ready for follow-up questions." },
      { id: "nontech", label: "Non-technical exec", style: "Wants outcomes, not internals. Plain words, one analogy, business impact." },
    ],
    scenarios: [
      { id: "Demo intro", hint: "Tie the demo to their problem", brief: "Introduce a technical demo by tying it to the problems you heard in discovery." },
      { id: "Technical objection", hint: "Acknowledge, prove, reframe", brief: "The buyer raises a technical objection about security, scale or integration. Acknowledge, prove, and reframe." },
      { id: "Explain the architecture simply", hint: "One clear picture, no jargon", brief: "Explain how the product fits into their architecture in one clear picture, without jargon.", defaultAudience: "nontech" },
    ],
  },
  {
    id: "pm",
    label: "Product Management",
    role: "product manager",
    match: /product manag|\bpm\b/i,
    audiences: [
      { id: "stakeholder", label: "Stakeholder", style: "Cares about their outcome. Clear trade-offs, honest timelines, what it means for them." },
      { id: "engineering", label: "Engineering team", style: "Wants the why and the constraints. Problem, user evidence, scope, open questions." },
      { id: "exec", label: "Exec", style: "Strategy and impact first. Tie it to company goals with one clear recommendation." },
    ],
    scenarios: [
      { id: "Pitch a feature", hint: "Problem, evidence, impact", brief: "Pitch a new feature: the user problem, the evidence, and the impact if you build it." },
      { id: "Say no to a request", hint: "Respectful, clear, offer an alternative", brief: "Decline a feature request respectfully and clearly, explain the trade-off, and offer an alternative.", defaultAudience: "stakeholder" },
      { id: "Roadmap update", hint: "What's next, what moved, why", brief: "Give a roadmap update: what's next, what moved, and why.", defaultAudience: "exec" },
    ],
  },
  {
    id: "other",
    label: "Other",
    role: "professional",
    audiences: [
      { id: "peer", label: "Peer", style: "Collegial and direct. Get to the point and make it easy to say yes." },
      { id: "senior", label: "Senior leader", style: "Bottom line first, business impact, brief and confident." },
      { id: "customer", label: "Customer", style: "Their problem and outcome first, plain words, a clear next step." },
    ],
    scenarios: [
      { id: "Elevator intro", hint: "Who you are and why it matters", brief: "Introduce yourself and what you do in about 30 seconds, and why it matters to this person." },
      { id: "Persuade a sceptic", hint: "Find common ground, then the case", brief: "Persuade someone who is sceptical of your idea. Find common ground, make the case, and ask for a small yes." },
      { id: "Deliver bad news", hint: "Clear, honest, with a plan", brief: "Deliver bad news clearly and honestly, then give a plan for what happens next." },
      { id: "Make an ask", hint: "Context, the ask, why it's worth it", brief: "Make a specific ask: the context, exactly what you need, and why it's worth their time." },
    ],
  },
];

/** Goals where the context field is about what you sell. */
export const SELLING_GOAL_IDS = ["sales", "sdr", "cs", "se"];

/** Score dimensions per practice type (used by ScoreCard and Progress). */
export const READING_DIMENSIONS = [
  { key: "accuracy", label: "Accuracy" },
  { key: "fluency", label: "Fluency" },
  { key: "pace", label: "Pace" },
];

export const PITCH_DIMENSIONS = [
  { key: "structure", label: "Structure" },
  { key: "valueFocus", label: "Value" },
  { key: "salesLanguage", label: "Sounds the part" },
  { key: "confidence", label: "Confidence" },
];

/** Theme list for daily check-in “pick a theme” (matches server rotation). */
export const THEMES = [...FOCUS_AREA_OPTIONS];

export const MOODS = [
  { id: "fresh", label: "Fresh", hint: "Up for a stretch" },
  { id: "focused", label: "Focused", hint: "Steady pace" },
  { id: "tired", label: "Tired", hint: "Gentle but clear" },
];

export const PASSAGE_LENGTH_MINUTES = {
  short: 2,
  medium: 4,
  long: 6,
};
