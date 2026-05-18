/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper:      "#F7F4EF",
        paperDark:  "#EEEAE3",
        ink:        "#1C1917",
        inkMuted:   "#78716C",
        inkFaint:   "#A8A29E",
        accent:     "#B45309",
        accentDeep: "#92400E",
        accentSoft: "#FEF3C7",
        border:     "#E7E5E4",
        borderDark: "#D6D3D1",
      },
      fontFamily: {
        serif: ['"Lora"', "Georgia", "serif"],
        sans:  ['"DM Sans"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft:  "0 1px 3px rgba(28,25,23,0.06), 0 8px 24px rgba(28,25,23,0.07)",
        card:  "0 2px 8px rgba(28,25,23,0.06), 0 16px 48px rgba(28,25,23,0.08)",
        glow:  "0 0 0 3px rgba(180,83,9,0.15)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
