import * as jwt from "jsonwebtoken";
import { IAuthToken } from "./auth-token.i";
import { IPermission } from "./permission.i";

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
