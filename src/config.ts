import * as dotenv from "dotenv";

const defaultFilePath = `${__dirname}/../.env`;

export const config = (configRecipe?: { filePath?: string }) => {
  if (!configRecipe) { configRecipe = {}; }
  dotenv.config({ path: configRecipe.filePath || defaultFilePath });
};
