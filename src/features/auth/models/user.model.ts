import { IModelSheet } from "../../../interfaces";

export const UserModelSheet: IModelSheet = {
  modelName: "user",
  schema: {
    properties: {
      id: { type: "number" },
      login: { type: "string" },
      name: { type: "string" },
      password: { type: "string" },
    },
    type: "object",
  },
};
