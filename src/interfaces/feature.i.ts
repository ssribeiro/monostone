import { ICommand, IModel } from "./";

export interface IFeature {
  featureName: string;
  models?: IModel[];
  commands?: ICommand[];
}
