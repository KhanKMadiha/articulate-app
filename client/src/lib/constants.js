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
