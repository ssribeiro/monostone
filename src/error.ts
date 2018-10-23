import * as ast from "@angstone/node-util";

export const error = {
  is(message: any, ...details: any[]) {
    ast.error(message);
    if (details.length > 0) {
      details.forEach((detail) => {
        ast.error(detail);
      });
    }
  },
  fatal(message: any, ...details: any[]) {
    ast.error(message);
    if (details.length > 0) {
      details.forEach((detail) => {
        ast.error(detail);
      });
    }
    process.exit(1);
  },
  throw(message: any) {
    throw new Error(message);
  },
};
