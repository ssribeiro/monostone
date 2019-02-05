import { IView } from "./";

export interface IViewLoaded extends IView {
  featureName: string;
  viewName: string;
  viewTag: string;
}
