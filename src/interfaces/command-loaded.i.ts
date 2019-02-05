import { ICommand } from "./";

/**
 * a command to api
 */
export interface ICommandLoaded extends ICommand {
  commandType: string;
}
