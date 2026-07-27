import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F7F8FA",
        "paper-line": "#E4E7EC",
        ink: {
          DEFAULT: "#141B2E",
          soft: "#3B4356",
        },
        slate: {
          DEFAULT: "#5B6472",
        },
        ledger: {
          green: "#1F7A5C",
          "green-soft": "#E4F1EC",
          amber: "#B7791F",
          "amber-soft": "#FBF0DD",
          red: "#B14343",
          "red-soft": "#F8E9E9",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "tape-in": {
          "0%": { opacity: "0", transform: "translateY(-6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        scan: "scan 1.4s linear infinite",
        "tape-in": "tape-in 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
