import { ICommandLoaded, ICronjob, IEffectLoaded, IViewLoaded } from "./";

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
  commands?: ICommandLoaded[];
  /**
   * The views it has
   */
  views?: IViewLoaded[];
  /**
   * The effects it takes care
   */
  effects?: IEffectLoaded[];
  /**
   * cronjobs it has
   */
  cronjobs?: ICronjob[];
}
