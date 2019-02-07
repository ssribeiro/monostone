// Name resolution fixes for nodejs:
import * as moduleAlias from 'module-alias'

// Monostone Starter
import * as ast from "@angstone/node-util"
import { App } from "./app"
import { error } from "./error"
import { config } from './config'

import { db as store } from './store'
import * as interfaces from './interfaces'
import * as tools from './tools'
import * as modules from './modules'
import * as SystemCommands from './system_commands'

config()

if(process.env.NODE_ENV == 'development') {
  // Boot Process
  ast.log("booting monostone framework")

  // Create App
  ast.log("creating app")
  const app: App = new App()
  if (app) ast.success("app created")
  else error.fatal("fail in creating app")

  // Start Express App
  ast.log("starting app")
  app.start().then(() => ast.success("app successfully started") )
}


export {
  App,
  error,
  config,
  store,
  interfaces,
  tools,
  modules,
  SystemCommands
}
