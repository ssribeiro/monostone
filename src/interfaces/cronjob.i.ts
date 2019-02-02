// import { IReducer, IRuleSheet } from "./";

/**
 * Cron Job Object
 */
export interface ICronjob {
  /**
   * cronjob string formatted according pattern https://crontab-generator.org/
   */
  cron: string;
  /**
   * function job to be executed
   */
  job: (onComplete: () => void) => void;
  /**
   * called on there is an error
   */
  onError?: (error?: any) => void;
}
