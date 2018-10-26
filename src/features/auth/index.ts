import { IFeature } from "../../interfaces";
import { FeatureTools } from "../../tools";
import { UserModelSheet } from "./models/user.model";

export const feature = (): IFeature => {
  return FeatureTools.createFeature({
     commandNames: [
       "signup",
     ],
     featurePath: __dirname,
     modelSheets: [
       UserModelSheet,
     ],
 });
};
