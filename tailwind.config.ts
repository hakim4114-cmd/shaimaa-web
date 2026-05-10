import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#fbf7ef",
        pearl: "#f5ede1",
        sand: "#dcc8ad",
        cedar: "#3a2418",
        coffee: "#5a3a28",
        henna: "#8f4b2f",
        brass: "#c69a4a",
        olive: "#4f5a37",
        ink: "#1f1712"
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 24px 70px rgba(58, 36, 24, 0.12)"
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "fade-up": "fade-up 780ms ease-out both"
      }
    }
  },
  plugins: []
};

export default config;
