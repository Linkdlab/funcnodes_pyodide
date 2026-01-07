// vite.browser.config.js
import { defineConfig } from "vite";
import path from "path";
import dts from "vite-plugin-dts";

export default defineConfig(({ mode }) => {
  const production = mode === "production";

  // load version number from package.json
  const pkg = require("./package.json");
  const version = pkg.version;
  const basename = pkg.name.replace(/@.*\//, "") + ".worker";

  return {
    plugins: [
      dts({
        insertTypesEntry: true,
      }),
    ],
    base: "", // Set the base URL for the app (e.g., for deployment)
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
      // global: "window", // replacement if you need the global object in browser builds.
    },
    build: {
      sourcemap: !production,
      emptyOutDir: false,
      target: "es2020",
      cssCodeSplit: false, // disable CSS code splitting, css will be in a separate file
      assetsInlineLimit: 0, // disable inlining assets; output them as separate files
      outDir: "dist",
      lib: {
        entry: path.resolve(__dirname, "src", "pyodideWebWorker.mts"), // your library's entry point
        formats: ["cjs", "es"], // output format
        name: basename, // change as needed
        fileName: (format) => `[name].${format}.js`, // output file name pattern
      },
      rollupOptions: {
        output: {
          banner: "var global = window;",
        },
        // If you need to bundle all dependencies (i.e. non-externalized) for a browser IIFE,
        // you can adjust the external config accordingly (or leave external: [] as desired)
        external: [],
      },
      // If you have multiple entry points (e.g., one for JS and one for CSS), you can specify:
      // rollupOptions: {
      //   input: {
      //     main: path.resolve(__dirname, 'src/browser_index.tsx'),
      //     style: path.resolve(__dirname, 'src/index.scss'),
      //   },
      // }
      // (Vite will output separate bundles based on these entries)
    },
  };
});
