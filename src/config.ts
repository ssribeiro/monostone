// use dot env library to import the
// env file and load config variables
// and constants
import * as dotenv from "dotenv";
import { IConfigRecipe } from './interfaces';

let defaultFilePath: string = `${__dirname}/../.env`;

if( process.env.FRAMEWORK_ENV == 'packed' ) {
  defaultFilePath = '.env';
}

/**
 * Loads the enviroment variables.
 * @param  !configRecipe a recipe for configuring
 */
export const config = (configRecipe?: IConfigRecipe) => {
  if (!configRecipe) { configRecipe = {}; }
  console.log(configRecipe.envPath)
  dotenv.config({ path: configRecipe.envPath || defaultFilePath });

  if (configRecipe.featuresPath)
    process.env.FEATURES_PATH = configRecipe.featuresPath
};
