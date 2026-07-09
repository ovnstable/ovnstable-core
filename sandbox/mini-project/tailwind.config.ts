import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 24px 80px rgba(21, 36, 66, 0.12)",
        lift: "0 16px 50px rgba(21, 36, 66, 0.16)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseLine: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        rise: "rise 280ms ease-out both",
        "pulse-line": "pulseLine 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
