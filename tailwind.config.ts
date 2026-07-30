import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0F172A",
          muted: "#334155",
          faint: "#64748B",
        },
        paper: {
          DEFAULT: "#F3F6F2",
          warm: "#E8EFE8",
          line: "#D2DDD4",
        },
        note: {
          DEFAULT: "#FFFEF8",
        },
        accent: {
          DEFAULT: "#0F9F93",
          hover: "#0B7F76",
          soft: "#C5F5EF",
          mist: "#E8FAF7",
        },
        spark: {
          DEFAULT: "#F5C518",
          soft: "#FFF4C2",
          deep: "#D4A017",
        },
        danger: {
          DEFAULT: "#DC2626",
          soft: "#FEE2E2",
        },
      },
      animation: {
        "fade-up": "fadeUp 0.55s ease-out both",
        "fade-in": "fadeIn 0.45s ease-out both",
        pop: "pop 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)",
        wobble: "wobble 0.45s ease-in-out",
        "bounce-soft": "bounceSoft 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "arcade-flash": "arcadeFlash 0.7s ease-in-out",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pop: {
          "0%": { transform: "scale(0.86)", opacity: "0" },
          "60%": { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        wobble: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-2.5deg)" },
          "75%": { transform: "rotate(2.5deg)" },
        },
        bounceSoft: {
          "0%": { transform: "scale(0.9) translateY(6px)", opacity: "0" },
          "100%": { transform: "scale(1) translateY(0)", opacity: "1" },
        },
        arcadeFlash: {
          "0%, 100%": { opacity: "1", filter: "brightness(1)" },
          "50%": { opacity: "0.85", filter: "brightness(1.25)" },
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
