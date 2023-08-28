import resolve from "rollup-plugin-node-resolve";

function build() {
  return {
    input: "src/main.js",
    output: {
      file: "build/RayTracingRenderer.js",
      format: "es",
      globals: {
        three: "THREE",
      },
      name: "RayTracingRenderer",
    },
    plugins: [resolve()],
    external: ["three"],
  };
}

const bundle = [build()];

export default bundle;
