// import { IReducer, IRuleSheet } from "./";

/**
 * effect to be triggered by an event or cron schedule
 */
export interface IEffect {

  /**
   * name of the effect that identifies it (spaces/special chars not allowed)
   */
  name: string;

  /**
   * command name (or list of command names) that triggers this effect.
   */
  triggerAfterCommand: string | string[];

  /**
   * effect task to be executed
   */
  run: () => Promise<void>;
}
