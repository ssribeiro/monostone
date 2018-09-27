import * as dotenv from "dotenv";

const default_file_path = `${__dirname}/../.env`;

export const config = (config?: { file_path?: string }) => {
  if (!config) config = {};
  dotenv.config({ path: config.file_path || default_file_path });
};
