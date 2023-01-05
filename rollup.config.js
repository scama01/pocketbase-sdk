import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";
import nodePolyfills from "rollup-plugin-polyfill-node";

const name = require("./package.json").main.replace(/\.js$/, "");

const bundle = (config) => ({
  ...config,
  input: "src/index.ts",
  external: (id) => !/^[./]/.test(id),
});

export default [
  bundle({
    plugins: [esbuild.default(), nodePolyfills()],
    output: [
      {
        file: `${name}.js`,
        format: "cjs",
        sourcemap: true,
      },
      {
        file: `${name}.mjs`,
        format: "es",
        sourcemap: true,
      },
    ],
  }),
  bundle({
    plugins: [esbuild.default(), nodePolyfills()],
    output: [
      {
        file: `${name}.umd.js`,
        format: "umd",
        sourcemap: true,
        name: "PocketBase",
        globals: {
          "path-browserify": "path",
          axios: "axios",
          "event-source-polyfill": "eventSourcePolyfill",
        },
      },
    ],
  }),
  bundle({
    plugins: [dts.default()],
    output: {
      file: `${name}.d.ts`,
      format: "es",
    },
  }),
];
