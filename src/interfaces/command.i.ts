import { IReducer, IRuleSheet } from "./";

export interface ICommand {
  featureName: string;
  commandName: string;
  reducer?: IReducer;
  rule?: IRuleSheet;
}
