import { ICommand } from "./";

export interface IFeature {
  featureName: string;
  commands?: ICommand[];
}
