// import { IReducer, IRuleSheet } from "./";

export interface IViewSheet {
  watchEvents?: string[];
  isProtected?: boolean;
  renderInitial?: () => Promise<any>;
  renderUpdate?: (lastData?: any, event?: any) => Promise<any>;
  renderPublic?: (data?: any) => Promise<any>;
  renderPrivate?: (data?: any) => Promise<any>;
}
