// Monostone Starter
import * as ast from "@angstone/node-util"
import { App } from "./app"
import { error } from "./error"
import { config } from './config'

process.env.FRAMEWORK_ENV = 'development',

config()
// Boot Process
ast.log("booting monostone framework")

// Create App  SystemCommands

ast.log("creating app")
const app: App = new App()
if (app) ast.success("app created")
else error.fatal("fail in creating app")

// Start Express App
ast.log("starting app")
app.start().then(() => ast.success("app successfully started") )
