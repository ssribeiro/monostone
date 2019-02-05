import { IEventRead } from './';
import { IAuthToken } from "../features/auth/interfaces/auth-token.i";

/**
 * File loaded used to generate Views
 */
export interface IView {
  /**
   * unique name of the events to respond (spaces/special chars not allowed)
   */
  watchEvents?: string[];
  /**
   * if it does require the user to be authenticated
   */
  isProtected?: boolean;
  /**
   * How to set up data object to initial state
   */
  renderInitial?: () => Promise<any>;
  /**
   * Procedure to apply when any of the watched events appears
   */
  renderUpdate?: (lastData: any, event: IEventRead) => Promise<any>;
  /**
   * data formatted to non-authenticated users
   */
  renderPublic?: (data: any) => Promise<any>;
  /**
   * data formatted for authenticated users
   */
  renderPrivate?: (data: any, token: IAuthToken) => Promise<any>;
}
