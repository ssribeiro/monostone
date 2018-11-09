import { ICommand, ICronjob, IView } from "./";

export interface IFeature {
  featureName: string;
  commands?: ICommand[];
  views?: IView[];
  cronjobs?: ICronjob[];
}
