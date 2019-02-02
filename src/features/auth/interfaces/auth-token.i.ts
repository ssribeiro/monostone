import { IPermission } from "./permission.i";

export interface IAuthToken {
  dId: string;
  dTp: string;
  exp: number;
  id: number;
  uId: number;
  perm: IPermission;
}
