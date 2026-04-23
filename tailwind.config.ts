import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#f1f3f5',
        ink: '#1a1a2e',
        'ink-light': '#6b7280',
        accent: '#4f46e5',
        'accent-light': '#e0e7ff',
      },
      fontFamily: {
        mono: ['Geist Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;