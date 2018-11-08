import { IAuthToken } from "../features/auth/auth-token.i";

export interface IViewSheet {
  watchEvents?: string[];
  isProtected?: boolean;
  renderInitial?: () => Promise<any>;
  renderUpdate?: (lastData?: any, event?: any) => Promise<any>;
  renderPublic?: (data?: any) => Promise<any>;
  renderPrivate?: (data: any, token: IAuthToken) => Promise<any>;
}
