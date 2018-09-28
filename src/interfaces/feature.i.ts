import { ICommand, IModel } from "./";

export interface IFeature {
  name: string;
  models?: IModel[];
  commands?: ICommand[];
}
