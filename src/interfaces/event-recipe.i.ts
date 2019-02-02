import { ICommand } from "./";

/**
 * recipe to create an event to be dispatched to Event Store
 */
export interface IEventRecipe {
  command: ICommand;
  /**
   * parameters
   */
  request?: any
}
