// Name resolution fixes for nodejs:
import * as moduleAlias from 'module-alias'

moduleAlias.addAliases({
  'store'  : __dirname + '/store',
  'interfaces'  : __dirname + '/interfaces',
  'tools'  : __dirname + '/tools',
  'error'  : __dirname + '/error',
  'features'  : __dirname + '/features',
})

// Monostone Starter
import * as ast from "@angstone/node-util"
import { App } from "./app"
import { error } from "./error"

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
