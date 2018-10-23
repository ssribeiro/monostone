import { IRuleSheet } from "../../../interfaces";
import { Store } from "../../../store";
import { messages } from "./signup.messages";

export const ruleSheet: IRuleSheet = {

  preValidation: (req: any): Promise<string|undefined> =>
    new Promise<string>((resolve, reject) => {
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

  validation: async (req: any): Promise<string|undefined> => {
    const user = await Store.getMapper("user").findAll({ login: req.login}).catch((err: any) => {
      if (err.msg === "Table `dev.user` does not exist.") { return []; } else { throw(err); }
    });
    return user.length > 0 ? messages.LOGIN_TAKEN : undefined;
  },

  respond: (eventNumber: number, req: any): Promise<any> =>
    new Promise<any>((resolve, reject) => {
      resolve({ eventNumber });
    }),

};
