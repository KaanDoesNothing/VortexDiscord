module.exports = {
    apps: [
      {
        name: "VortexClient",
        script: "./index.ts",
        interpreter: "deno",
        interpreterArgs: "run --allow-all",
      }
    ]
};
  