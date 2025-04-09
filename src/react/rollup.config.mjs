
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
  plugins: [
    typescript({
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
  ].filter(Boolean),

  output: [
    {file: path.resolve(__dirname, pkg.module),
      format: "esm",
      sourcemap: true,
      assetFileNames: "[name][extname]",
      plugins: [],
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
  ].filter(Boolean),
  output: [
    {
      file: path.resolve(__dirname, "public","index.js"),
      format: "iife",
      sourcemap: true,
      assetFileNames: "[name][extname]",
    },
  ],
}

const commonWorkerConf = {
  plugins:[
    
    typescript({
      resolveJsonModule: true,
      compilerOptions: { declaration: false }
  }),
    commonjs(),
    resolve({browser: true}),
    replace({
      '__DEFAULT_PYODIDE_URL__': JSON.stringify("https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.mjs"),
      preventAssignment: true,
    }),
    production&&terser(), 
    copy({
      targets: [
        { src: 'src/pyodideWorker.mjs', dest: path.dirname( path.resolve(__dirname, pkg.module))  },
      ]
    }),
  ].filter(Boolean),
  output:[
    {
      dir: path.resolve(__dirname, "public",),
      format: "esm",
      sourcemap: true,
      assetFileNames: "[name][extname]",
      plugins:[
        // copy({
        //   hook:"writeBundle",
        //   targets: [
        //     { src: [
        //       // path.resolve(pyodideDir,'**',"*"),
        //       // path.resolve(pyodideDir,"*")
        //       "node_modules/pyodide/**/*",
        //       "node_modules/pyodide/*",
        //     ], dest:  path.resolve(__dirname, "public","assets","pyodide")  },
        //   ]
        // }),
        
        production &&
        copy({
          targets: [
            {
              src: "public/*.{js,js.map,css}",
              dest: "../funcnodes_pyodide/static",
            },
          ],
          hook: "writeBundle",
        }),
      ].filter(Boolean),
    },
    {
      dir: path.resolve(__dirname, "dist","worker"),
      format: "esm",
      sourcemap: true,
      assetFileNames: "[name][extname]",
    },
   
  ]
}

const bundleSharedWorkerConf = {
  input: "src/pyodideSharedWorker.mts",
  plugins: commonWorkerConf.plugins,
  output:commonWorkerConf.output
}

const bundleWorkerLogicConf = {
  input: "src/pyodideWorkerLogic.mts",
  plugins: commonWorkerConf.plugins,
  output:commonWorkerConf.output
}

const bundleWorkerLayoutConf = {
  input: "src/pyodideWorkerLayout.mts",
  plugins: commonWorkerConf.plugins,
  output:commonWorkerConf.output
}

const bundleDedicatedWorkerConf = {
  input: "src/pyodideDedicatedWorker.mts",
  plugins: commonWorkerConf.plugins,
  output:commonWorkerConf.output
}


const dtsWorkerLayoutConfig={
  input: bundleWorkerLayoutConf.input,
  output: [{ dir: path.resolve(__dirname, "dist","worker"), format: "es" }],
  external: [],
  plugins: [dts()],
};

const dtsWorkerLogicConf={
  input: bundleWorkerLogicConf.input,
  output: [{ dir: path.resolve(__dirname, "dist","worker"), format: "es" }],
  external: [],
  plugins: [dts()],
};

export default [
  bundleSharedWorkerConf,
  bundleDedicatedWorkerConf,
  bundleWorkerLogicConf,
  bundleWorkerLayoutConf,
  dtsWorkerLayoutConfig,
  dtsWorkerLogicConf,
  moduleConfig,
  dtsConfig,
  bundleConfig, //neds to be last for worker code injection
];

