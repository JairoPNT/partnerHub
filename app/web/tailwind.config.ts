import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./modules/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
        heading: ["var(--font-heading)", "Outfit", "sans-serif"]
      },
      colors: {
        sand: {
          50: "#fcf8f2",
          100: "#f7efe0",
          200: "#edd9b5",
          300: "#d7b57b",
          400: "#c58a3b",
          500: "#a96a17",
          600: "#864d0f",
          700: "#683b0f",
          800: "#4f2d0d",
          900: "#321c09"
        }
      },
      boxShadow: {
        glow: "0 24px 80px rgba(166, 105, 23, 0.14)",
        subtle: "0 4px 20px rgba(0, 0, 0, 0.03)",
        premium: "0 10px 30px -10px rgba(134, 77, 15, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02)"
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem"
      }
    }
  },
  plugins: []
};

export default config;


