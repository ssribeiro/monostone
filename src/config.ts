import * as dotenv from "dotenv";

const defaultFilePath = `${__dirname}/../.env`;

export const config = (config?: { filePath?: string }) => {
  if (!config) { config = {}; }
  dotenv.config({ path: config.filePath || defaultFilePath });
};
