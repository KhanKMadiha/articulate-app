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

/** Pitch practice scenarios (keys must match PITCH_SCENARIOS on the server). */
export const PITCH_SCENARIOS = [
  { id: "Elevator pitch", hint: "60 seconds with a senior buyer" },
  { id: "Cold call opener", hint: "Earn the next 5 minutes" },
  { id: "Discovery call", hint: "Uncover pain and impact" },
  { id: "Product demo", hint: "Tie the demo to their problem" },
  { id: "Handling an objection", hint: "Acknowledge, explore, reframe" },
  { id: "Closing next steps", hint: "Lock in a concrete next step" },
];

/** Score dimensions per practice type (used by ScoreCard and Progress). */
export const READING_DIMENSIONS = [
  { key: "accuracy", label: "Accuracy" },
  { key: "fluency", label: "Fluency" },
  { key: "pace", label: "Pace" },
];

export const PITCH_DIMENSIONS = [
  { key: "structure", label: "Structure" },
  { key: "valueFocus", label: "Value" },
  { key: "salesLanguage", label: "Sales voice" },
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
