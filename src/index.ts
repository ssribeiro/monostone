// Monostone Starter
import * as ast from "@angstone/node-util";
import { App } from "./app";
import { error } from "./error";

// Boot Process
ast.log("booting monostone framework");
ast.log("loading configuration");

// Create Express App
ast.log("creating express app");
const app: App = new App();
if (app) {
  ast.success("express app created");
} else {
  error.fatal("fail in creating express app");
}

global.monoApp = app;

// Start Express App
ast.log("starting express app");
app.start().then(() => {
  ast.success("express app successfully started");
});
