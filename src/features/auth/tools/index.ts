import * as jwt from "jsonwebtoken";
import { db } from "../../../store";
import { IAuthToken } from "../interfaces/auth-token.i";
import { messages } from "../messages";
import { IPermission } from "../interfaces/permission.i";

export const APPLICATION_KEY: string = process.env.FEATURE_AUTH_APPLICATION_KEY || "klapaucius !;!;!;";

export const loadPermissionForRole = (role: string): IPermission => {
  switch (role) {
    default: return {
      vw: {
        all: true,
      },
    };
  }
};

export const createToken = (authentication: any, role: string): string => {
  const authToken: IAuthToken = {
    dId: authentication.deviceId,
    dTp: authentication.deviceType,
    exp: authentication.expiresAt,
    id: authentication.id,
    perm: loadPermissionForRole(role),
    uId: authentication.userId,
  };
  return jwt.sign(authToken, APPLICATION_KEY);
};

export const decodeToken = async (token: string): Promise<IAuthToken> => {
  return new Promise<IAuthToken>((resolve, reject) => {
    jwt.verify(token, APPLICATION_KEY, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        const decodedToken: IAuthToken = decoded as IAuthToken;
        db().collection("authentication").findOne({ id: decodedToken.id }).then((authentication: any) => {
          if (authentication) {
            if (authentication.userId === decodedToken.uId) {
              resolve(decodedToken);
            } else {
              reject(new Error(messages.TOKEN_NOT_VERIFIED_AS_CLAIMED));
            }
          } else {
            reject(new Error(messages.TOKEN_EXPIRED));
          }
        }).catch((error: any) => {
          reject(error);
        });
      }
    });
  });
};
