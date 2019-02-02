import { ICronjob, IEffect } from "./";

/**
 * A Feature Supported by the Api
 */
export interface IFeature {
  featurePath: string;
  commandNames?: string[];
  viewNames?: string[];
  /**
   * The effects it takes care
   */
  effects?: IEffect[];
  /**
   * cronjobs it has
   */
  cronjobs?: ICronjob[];
}
