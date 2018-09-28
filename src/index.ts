import * as ast from "@angstone/node-util";
import { App } from "./app";
import { config } from "./config";
import { error } from "./error";

/* Boot Process */
ast.log("booting monostone framework");
ast.log("loading configuration");

// Config
config();
if (process.env.NODE_ENV === "production"
  || process.env.NODE_ENV === "development") {
  ast.success("configuration loaded");
} else {
  error.fatal("configuration failed - please verify .env file");
}
ast.info("configured environment: " + process.env.NODE_ENV);

// Create Express App
ast.log("creating express app");
const app: App = new App();
if (app) {
  ast.success("express app created");
} else {
  error.fatal("fail in creating express app");
}

// Start Express App
ast.log("starting express app");
app.start();
ast.success("express app successfully started");
