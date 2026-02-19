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
        jost: ["var(--font-jost)", "sans-serif"],
        hias: ["var(--font-hias-sans)", "sans-serif"],
        boldmarker: ["var(--font-bold-marker)", "sans-serif"],
        insanibu: ["var(--font-insanibu)", "sans-serif"],
        insanibc: ["var(--font-insanibc)", "sans-serif"],
      },
      colors: {
        background: "#1d1d1d",
        background2: "#282828",
        vert: "#1DD05D",
      },
      fontSize: {
        'titre': ['4.5rem', { lineHeight: '1', fontWeight: '900' }],
        's-titre': ['2.25rem', { lineHeight: '1.2', fontWeight: '700' }],
        'ss-titre': ['1.5rem', { lineHeight: '1.2', fontWeight: '600' }],
        'texte': ['1rem', { lineHeight: '1.5', fontWeight: '400' }],
      }
    },
  },
  plugins: [],
};
export default config;