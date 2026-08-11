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
        heading: ["var(--font-heading)", "Sora", "sans-serif"]
      },
      colors: {
        ph: {
          blue: "#0086FE",
          navy: "#0B1D3A",
          light: "#E6F2FF",
          bg: "#F5F8FC",
          success: "#00C2A8",
        }
      },
      boxShadow: {
        card: "0 4px 24px -8px rgba(11, 29, 58, 0.08)",
        glow: "0 10px 30px rgba(0, 134, 254, 0.2)",
        subtle: "0 4px 20px rgba(0, 0, 0, 0.03)",
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

