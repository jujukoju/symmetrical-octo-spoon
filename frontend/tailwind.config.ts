import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // ── NIMC Color System ─────────────────────────────────────────────────
        // Primary: Nigeria deep green
        green: {
          DEFAULT: "#006B3F",   // Deep Nigeria green (primary accent)
          light: "#008751",     // Medium green (hover state)
          lighter: "#00A85A",   // Bright green (highlights)
          muted: "#006B3F1A",   // Green at 10% opacity
          dark: "#004D2C",      // Very dark green
        },

        // Surface/background tokens
        surface: {
          DEFAULT: "#FFFFFF",   // Pure white (cards)
          soft: "#F5F7F5",      // Very light green-tinted white (page bg)
          muted: "#EBF0EB",     // Slightly more tinted (dividers/alt rows)
          border: "#D1D9D1",    // Border on light backgrounds
        },

        // Text tokens (dark on light bg)
        ink: {
          DEFAULT: "#1C2B22",   // Near-black with green undertone (primary text)
          secondary: "#3D5240", // Dark green-gray (secondary text)
          muted: "#6B7F6E",     // Lighter muted text
          light: "#9AAD9C",     // Very light text / placeholders
        },

        // Dark header/footer/nav band
        nimc: {
          DEFAULT: "#003D24",   // Very dark green header/footer bg
          mid: "#004F2E",       // Slightly lighter dark green (hover in nav)
          border: "#005A35",    // Subtle border inside dark band
          text: "#C8E6C9",      // Pale green text inside dark band
        },

        // Keep `charcoal` for backward compat in dropdowns/overlays
        charcoal: {
          DEFAULT: "#003D24",
          light: "#004F2E",
          mid: "#005A35",
          border: "#006B3F40",
        },

        // Keep `gold` pointing to green so no old gold refs break visually
        gold: {
          DEFAULT: "#006B3F",
          light: "#008751",
          dark: "#004D2C",
          muted: "#006B3F1A",
        },

        status: {
          verified: "#10B981",
          pending: "#D97706",
          denied: "#EF4444",
          active: "#2563EB",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "count-up": "countUp 1s ease-out forwards",
        "pulse-green": "pulseGreen 2s ease-in-out infinite",
        "slide-up": "slideUp 0.4s ease-out forwards",
        "fade-in": "fadeIn 0.5s ease-out forwards",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        countUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseGreen: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(0,107,63,0.35)" },
          "50%": { boxShadow: "0 0 0 8px rgba(0,107,63,0)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(0,107,63,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,107,63,0.05) 1px, transparent 1px)",
        "green-shimmer":
          "linear-gradient(90deg, transparent 0%, rgba(0,107,63,0.08) 50%, transparent 100%)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
      boxShadow: {
        "green-sm": "0 2px 8px rgba(0,107,63,0.12)",
        "green-md": "0 4px 16px rgba(0,107,63,0.18)",
        "green-lg": "0 8px 32px rgba(0,107,63,0.22)",
        card: "0 1px 4px rgba(28,43,34,0.08), 0 4px 16px rgba(28,43,34,0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
