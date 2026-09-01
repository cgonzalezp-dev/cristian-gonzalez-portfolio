import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#00111F",
          900: "#001E38",
          800: "#002E67",
          700: "#0A3F7D",
          600: "#155091",
        },
        paper: {
          50: "#F4F5F8",
          100: "#E9EDF3",
          200: "#D6DEEA",
        },
        brass: {
          400: "#0099FF",
          500: "#006EF1",
          600: "#0056C4",
        },
        ember: {
          400: "#FF9A47",
          500: "#FF8322",
          600: "#E86A0A",
        },
        signal: {
          up: "#22C58B",
          down: "#EF5B65",
        },
      },
      fontFamily: {
        sans: ["Inter var", "Inter", "system-ui", "sans-serif"],
        serif: ["Georgia", "Iowan Old Style", "Times New Roman", "serif"],
      },
      maxWidth: {
        content: "1120px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,17,31,0.06), 0 8px 24px -12px rgba(0,17,31,0.22)",
        softLg: "0 4px 12px rgba(0,17,31,0.08), 0 24px 48px -16px rgba(0,17,31,0.28)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
