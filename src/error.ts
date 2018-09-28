import * as ast from "@angstone/node-util";

export const error = {
  fatal(message: any) {
    ast.error(message);
    process.exit(1);
  },
};
