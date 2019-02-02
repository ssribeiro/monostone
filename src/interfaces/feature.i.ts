import { ICommand, ICronjob, IEffect, IView } from "./";

/**
 * A Feature Supported by the Api
 */
export interface IFeature {
  /**
   * unique name of the feature (spaces/special chars not allowed)
   */
  featureName: string;
  /**
   * The commands it adds
   */
  commands?: ICommand[];
  /**
   * The views it has
   */
  views?: IView[];
  /**
   * The effects it takes care
   */
  effects?: IEffect[];
  /**
   * cronjobs it has
   */
  cronjobs?: ICronjob[];
}
