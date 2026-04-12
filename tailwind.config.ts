import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        harmond: ["var(--font-harmond)", "serif"],
        pixelify: ["var(--font-pixelify)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;