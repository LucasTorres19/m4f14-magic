/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cards.scryfall.io",
      },
      {
        protocol: "https",
        hostname: "utfs.io",
      },
    ],
  },
  typedRoutes: true,
  turbopack: {
    rules: {
      "*.svg": {
        loaders: [
          {
            loader: "@svgr/webpack",
            options: {
              // Optional: Customize SVGR options here
              svgoConfig: {
                plugins: [
                  {
                    name: "preset-default",
                    params: {
                      overrides: {
                        removeViewBox: false, // Example: keep viewBox
                      },
                    },
                  },
                  "removeDimensions",
                ],
              },
            },
          },
        ],
        as: "*.js", // Treat the output as a JavaScript module
      },
    },
  },
};

export default config;
