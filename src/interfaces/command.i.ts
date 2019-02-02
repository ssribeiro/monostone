import { IReducer, IRule } from "./";

/**
 * a command to api
 */
export interface ICommand {
  /**
   * name of the feature (spaces/special chars not allowed)
   */
  featureName: string;
  /**
   * name of the command (spaces/special chars not allowed)
   */
  commandName: string;
  reducer?: IReducer;
  rule?: IRule;
}
