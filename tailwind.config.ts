import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F5F0E8",
        ink: "#1A1815",
        "ink-soft": "#3A3530",
        muted: "#8A857E",
        line: "#D8D2C7",
        acid: "#C8FF00",
        acid_dark: "#A8DD00",
      },
      fontFamily: {
        display: ['"Fraunces"', "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
    },
  },
  plugins: [],
};

export default config;
