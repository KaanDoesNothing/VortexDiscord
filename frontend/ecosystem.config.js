module.exports = {
    apps: [
      {
        name: "VortexFrontend",
        exec_mode: "cluster",
        instances: "max",
        script: "./.output/server/index.mjs"
      }
    ]
  }