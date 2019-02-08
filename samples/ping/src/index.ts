console.log('type run')

import {
  App,
  config,
  IConfigRecipe,
} from '../../../src'

config({
  envPath: __dirname+'/../.env',
  featuresPath: __dirname+'/features'
} as IConfigRecipe)
console.log(process.env.NODE_ENV)
console.log(process.env.FEATURES_PATH)

const app = new App();
app.start()

export { app }
