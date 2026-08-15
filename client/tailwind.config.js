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
          50: "#f5f3fe",
          100: "#ede9fd",
          200: "#dcd3fb",
          300: "#c3b3f8",
          400: "#a48af3",
          500: "#6D5EF5",
          600: "#5a4ad6",
          700: "#4a3ab5",
          800: "#3c2f92",
          900: "#302872",
          950: "#1e1847",
        },
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        heading: ["Titillium Web", "system-ui", "-apple-system", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.35s ease-out both",
        "fade-in-up": "fadeInUp 0.4s ease-out both",
        "scale-in": "scaleIn 0.25s ease-out both",
        "modal-in": "modalIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) both",
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
