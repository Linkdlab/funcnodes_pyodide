
import scssloader from "rollup-plugin-scss";
import json from '@rollup/plugin-json';
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import alias from "@rollup/plugin-alias";
import { terser } from "rollup-plugin-terser";
import nodePolyfills from 'rollup-plugin-node-polyfills';
import typescript from '@rollup/plugin-typescript';
import pkg from "./package.json"  with { type: "json" };
import * as sass from "sass";
import path from "path";
import { dts } from "rollup-plugin-dts";
import replace from '@rollup/plugin-replace';
import { string } from "rollup-plugin-string";
import copy from 'rollup-plugin-copy';
import plugin from "rollup-plugin-import-css";

const peers = Object.keys(pkg.peerDependencies || {});

const production = !process.env.ROLLUP_WATCH;
const moduleConfig = {
  input: "src/index.tsx",
  external: peers,
  onwarn(warning, warn) {
    if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
      return
    }
    warn(warning)
  },
  plugins: [typescript({
    resolveJsonModule: true,
    compilerOptions: { declaration: false }
}),
    alias({
      entries: [
      ],
    }),
    commonjs({
      // include: 'node_modules/**',
      // requireReturnsDefault: 'auto',
    }),
    resolve({browser: true,}),
    json(),
    string({
      // Required to be specified
      include: ["src/pyodideWorker.mjs"]
    }),
    scssloader({
      fileName: "style.css",
      sass: sass,
    }),
    nodePolyfills(),
    babel({
      babelHelpers: 'bundled',
      presets: ["@babel/preset-react"] ,
      exclude: /node_modules/,

    }),
    
    production&&terser(),
  ],

  output: [
    {file: path.resolve(__dirname, pkg.module),
      format: "esm",
      sourcemap: true,
      assetFileNames: "[name][extname]",
      plugins: [
        copy({
          targets: [
            { src: 'src/pyodideWorker.mjs', dest: path.dirname( path.resolve(__dirname, pkg.module))  },
          ]
        }),
      ],
    },
    {
      file:  path.resolve(__dirname,pkg.main),
      format: "cjs",
      exports: "named",
      strict: false,
      sourcemap: true,
      assetFileNames: "[name][extname]",
    },
    {
      file: path.resolve(__dirname, pkg.style),
      format: "esm",
      sourcemap: false,
      assetFileNames: "[name][extname]",
      plugins: [],
    },
  ]

}
const dtsConfig={
  input: moduleConfig.input,
  output: [{ file: path.resolve(__dirname, pkg.types), format: "es" }],
  external: [/\.scss$/,"react", "react-dom"],
  plugins: [dts()],
};


const bundleConfig={
  ...moduleConfig,
  external: [],
  input: "src/browser_index.tsx",
  plugins: [
    ...moduleConfig.plugins,
    replace({
      'process.env.NODE_ENV': production ? JSON.stringify('production') : JSON.stringify('development'),
      'global': 'window',
      preventAssignment: true,
    }),
  ],
  output: [
    {
      file: path.resolve(__dirname, "public","index.js"),
      format: "iife",
      sourcemap: true,
      assetFileNames: "[name][extname]",
    },
  ],
}

// const bundleWorkerConf = {
//   input: "src/pyodideWorker.mjs",
//   plugins: [
//     commonjs(),
//     resolve({browser: true}),
//     // production&&terser(),
//   ],
//   output:[
//     {
//       file: path.resolve(__dirname, "public","pyodideWorker.js"),
//       format: "esm",
//       sourcemap: true,
//       assetFileNames: "[name][extname]",
//     }
//   ]
// }

const bundleSharedWorkerConf = {
  input: "src/pyodideSharedWorker.mts",
  plugins: [
    typescript({
      resolveJsonModule: true,
      compilerOptions: { declaration: false }
  }),
    commonjs(),
    resolve({browser: true}),
    // production&&terser(),
  ],
  output:[
    {
      file: path.resolve(__dirname, "public","pyodideSharedWorker.js"),
      format: "esm",
      sourcemap: true,
      assetFileNames: "[name][extname]",
    },
    {
      file: path.resolve(__dirname, "dist","pyodideSharedWorker.js"),
      format: "esm",
      sourcemap: true,
      assetFileNames: "[name][extname]",
    }
  ]
}

export default [
  moduleConfig,
  dtsConfig,
  bundleConfig,
  // bundleWorkerConf,
  bundleSharedWorkerConf,
];

