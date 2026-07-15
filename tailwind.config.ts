import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#080D17",
          900: "#0B1220",
          800: "#111A2C",
          700: "#1B2740",
          600: "#2A3A5C",
        },
        paper: {
          50: "#FAF9F6",
          100: "#F5F2EA",
          200: "#EAE5D9",
        },
        brass: {
          400: "#D9B36C",
          500: "#C79A4B",
          600: "#A67C34",
        },
        signal: {
          up: "#5FCB8D",
          down: "#E8756B",
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
