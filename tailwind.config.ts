import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#04070F",
          900: "#0A1330",
          800: "#101D46",
          700: "#1A2C63",
          600: "#2A4488",
        },
        paper: {
          50: "#F8FAFD",
          100: "#EDF2FA",
          200: "#DCE5F3",
        },
        brass: {
          400: "#5B93FF",
          500: "#2F6FED",
          600: "#1B4FC4",
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
        soft: "0 1px 2px rgba(8,13,23,0.04), 0 8px 24px -12px rgba(8,13,23,0.18)",
        softLg: "0 4px 12px rgba(8,13,23,0.06), 0 24px 48px -16px rgba(8,13,23,0.22)",
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
