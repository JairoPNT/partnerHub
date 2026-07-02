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
        glow: "0 24px 80px rgba(166, 105, 23, 0.14)"
      }
    }
  },
  plugins: []
};

export default config;

