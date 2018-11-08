import { ICommand, IView } from "./";

export interface IFeature {
  featureName: string;
  commands?: ICommand[];
  views?: IView[];
}
