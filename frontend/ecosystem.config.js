module.exports = {
    apps: [
      {
        name: "VortexFrontend",
        exec_mode: "cluster",
        instances: "max",
        port: 7807,
        script: "./.output/server/index.mjs"
      }
    ]
  }