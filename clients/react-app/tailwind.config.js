/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gray: {
          "100": "#918787",
          "200": "#84828e",
          "300": "#848181",
          "400": "#7f8083",
          "500": "#827b7b",
        },
        white: "#fff",
        mediumslateblue: {
          "100": "#2260ff",
          "200": "#0f54f4",
          "300": "#0057ff",
        },
        primary: "#545f71",
        secondary: "#9ba5b7",
        silver: {
          "100": "#cfc5c5",
          "200": "#c0b8b8",
        },
        black: "#000",
        whitesmoke: "#f5f5f5",
        royalblue: {
          "100": "#2f7fff",
          "200": "#2563e1",
        },
        dimgray: {
          "100": "#666",
          "200": "#525151",
        },
        tertiary: "#eef1f4",
        dodgerblue: {
          "100": "#478eff",
          "200": "#0386ff",
        },
        red: "#ff0000",
        darkgray: "#a6a6a6",
        darkorange: "#ff9d2b",
      },
      spacing: {},
      fontFamily: {
        body: "Inter",
      },
      borderRadius: {
        "3xs": "10px",
        "12xs": "1px",
        "8xs": "5px",
      },
    },
    fontSize: {
      sm: "14px",
      base: "16px",
      "5xs": "8px",
      xs: "12px",
      "3xl": "22px",
      "5xl": "24px",
      "3xs": "10px",
      "base-1": "16.1px",
      "7xl-4": "26.4px",
      "sm-6": "13.6px",
      "13xl": "32px",
      inherit: "inherit",
    },
    screens: {
      lg: {
        max: "1200px",
      },
      sm: {
        max: "420px",
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
};
