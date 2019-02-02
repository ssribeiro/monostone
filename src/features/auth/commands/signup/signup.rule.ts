import { IRule } from "interfaces";
import { db } from "store";
import { messages } from "./signup.messages";

export const rule: IRule = {

  preValidation: (req: any): Promise<string|undefined> =>
    new Promise<string>((resolve) => {
      if (!req.name) { resolve(messages.NO_NAME); }
      if (!req.login) { resolve(messages.NO_LOGIN); }
      if (!req.password) { resolve(messages.NO_PASSWORD); }
      if (!req.password_confirmation) { resolve(messages.NO_PASSWORD_CONFIRMATION); }
      // enshures 2 words
      if ( !/\b\w+\b(?:.*?\b\w+\b){1}/.test(req.name) ) { resolve(messages.WRONG_NAME); }
      // enshures 3 letter
      if ( !/(.*[a-zA-Z]){3}/.test(req.name) ) { resolve(messages.WRONG_NAME); }
      // enshures 6 digits regular login
      if ( !/^\S{6,}$/.test(req.login) ) { resolve(messages.WRONG_LOGIN); }
      // enshures 8 digits password
      if ( !/^\S{8,}$/.test(req.password) ) { resolve(messages.WRONG_PASSWORD); }
      if (req.password !== req.password_confirmation) { resolve(messages.WRONG_PASSWORD_CONFIRMATION); }
      resolve(undefined);
    }),

  validation: async (req: any): Promise<string|undefined|{ req: any }> => {
    const user = await db.collection("user").findOne({ login: req.login });
    if (user) {
      return messages.LOGIN_TAKEN;
    } else {
      req.createdAt = Date.now();
      req.role = "newuser";
      return { req };
    }
  },

  respond: (eventNumber: number, req: any): Promise<any> =>
    new Promise<any>((resolve) => {
      resolve({ userId: eventNumber });
    }),

};
