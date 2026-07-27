import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bingo: {
          pink: "#FF6B9D",
          purple: "#9B59B6",
          blue: "#3498DB",
          green: "#2ECC71",
          yellow: "#F1C40F",
          orange: "#E67E22",
          red: "#E74C3C",
        },
      },
      animation: {
        "bounce-in": "bounceIn 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both",
        "wiggle": "wiggle 0.3s ease-in-out",
        "pop": "pop 0.3s ease-out",
        "confetti-fall": "confettiFall 3s linear forwards",
      },
      keyframes: {
        bounceIn: {
          "0%, 20%, 40%, 60%, 80%, 100%": { transform: "scale(1)" },
          "10%": { transform: "scale(1.1)" },
          "30%": { transform: "scale(0.95)" },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(0.98)" },
          "90%": { transform: "scale(1.02)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        pop: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        confettiFall: {
          "0%": { transform: "translateY(-100vh) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(100vh) rotate(720deg)", opacity: "0" },
        },
      },
      fontFamily: {
        display: ["'Baloo 2'", "cursive"],
        body: ["'Nunito'", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
