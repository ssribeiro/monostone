import { ICommand, ICronjob, IEffect, IViewLoaded } from "./";

/**
 * A Feature Supported by the Api
 */
export interface IFeatureLoaded {
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
  views?: IViewLoaded[];
  /**
   * The effects it takes care
   */
  effects?: IEffect[];
  /**
   * cronjobs it has
   */
  cronjobs?: ICronjob[];
}
