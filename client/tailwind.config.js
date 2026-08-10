/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        slate: {
          950: "#0b1220",
        },
        brand: {
          50: "#eef7ff",
          100: "#d9edff",
          200: "#bce0ff",
          300: "#8ecdff",
          400: "#59b0ff",
          500: "#338efb",
          600: "#1d6ef0",
          700: "#1557dd",
          800: "#1847b3",
          900: "#1a3f8d",
          950: "#152856",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.35s ease-out both",
        "fade-in-up": "fadeInUp 0.4s ease-out both",
        "scale-in": "scaleIn 0.25s ease-out both",
        "modal-in": "modalIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 1.6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        modalIn: {
          from: { opacity: "0", transform: "translateY(16px) scale(0.97)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-hover":
          "0 10px 30px -8px rgb(2 12 27 / 0.18), 0 2px 6px -2px rgb(2 12 27 / 0.08)",
        glow: "0 0 0 3px rgb(51 142 251 / 0.25)",
      },
    },
  },
  plugins: [],
};
