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
        // Warm charcoal base with amber accents — "forge" aesthetic
        forge: {
          50: "#fef9f0",
          100: "#fdf0d9",
          200: "#fae0b2",
          300: "#f5c878",
          400: "#efa73d",
          500: "#eb9118",
          600: "#d1720e",
          700: "#ad5510",
          800: "#8b4314",
          900: "#723813",
          950: "#3e1b07",
        },
        carbon: {
          50: "#f6f6f6",
          100: "#e7e7e7",
          200: "#d1d1d1",
          300: "#b0b0b0",
          400: "#888888",
          500: "#6d6d6d",
          600: "#5d5d5d",
          700: "#4f4f4f",
          800: "#454545",
          900: "#3d3d3d",
          925: "#2a2a2a",
          950: "#1a1a1a",
          975: "#111111",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', "Menlo", "monospace"],
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        body: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(235, 145, 24, 0)" },
          "50%": { boxShadow: "0 0 20px 4px rgba(235, 145, 24, 0.15)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
