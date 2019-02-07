// use dot env library to import the
// env file and load config variables
// and constants
import * as dotenv from "dotenv";
import { IConfigRecipe } from './interfaces';

const defaultFilePath = `${__dirname}/../.env`;

/**
 * Loads the enviroment variables.
 * @param  !configRecipe a recipe for configuring
 */
export const config = (configRecipe?: IConfigRecipe) => {
  if (!configRecipe) { configRecipe = {}; }
  dotenv.config({ path: configRecipe.filePath || defaultFilePath });
  console.log(process.env.NODE_ENV)
};
