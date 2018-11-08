import { IRuleSheet } from "../../../interfaces";
import { db } from "../../../store";
import * as authTools from "../tools";
import { messages } from "./login.messages";

export const DEFAULT_EXPIRATION = (1000 * 60 * 60 * 24 * 28); // 28 days

export const ruleSheet: IRuleSheet = {

  preValidation: (req: any): Promise<string|undefined> =>
    new Promise<string>((resolve) => {
      if (!req.login) { resolve(messages.NO_LOGIN); }
      if (!req.password) { resolve(messages.NO_PASSWORD); }
      // enshures 6 digits regular login
      if ( !/^\S{6,}$/.test(req.login) ) { resolve(messages.WRONG_LOGIN); }
      // enshures 8 digits password
      if ( !/^\S{8,}$/.test(req.password) ) { resolve(messages.WRONG_PASSWORD); }
      if (!req.deviceId) { resolve(messages.NO_DEVICE_ID); }
      // enshures 3 digits regular deviceId
      if ( !/^\S{3,}$/.test(req.deviceId) ) { resolve(messages.WRONG_DEVICE_ID); }
      if (!req.deviceType) { resolve(messages.NO_DEVICE_TYPE); }
      // enshures 3 digits regular deviceId
      if ( !/^\S{3,}$/.test(req.deviceType) ) { resolve(messages.WRONG_DEVICE_TYPE); }
      resolve(undefined);
    }),

  validation: async (req: any): Promise<string|undefined|{req: any}> => {
    const user = await db.collection("user").findOne({ login: req.login });
    if (!user) {
      return messages.USER_NOT_FOUND;
    }
    if (req.password !== user.password) {
      return messages.TYPED_WRONG_PASSWORD;
    }
    req.createdAt = Date.now();
    const expiration = process.env.FEATURE_AUTH_EXPIRATION ? +process.env.FEATURE_AUTH_EXPIRATION : DEFAULT_EXPIRATION;
    req.expiresAt = Date.now() + expiration;
    req.userId = user.id;
    req.role = user.role;
    return { req };
  },

  respond: async (eventNumber: number, req: any): Promise<any> => {
    const authentication = await db.collection("authentication").findOne({ id: eventNumber });
    const token: string = authTools.createToken(authentication, req.role);
    return { token };
  },
};
