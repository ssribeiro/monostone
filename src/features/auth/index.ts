import { IFeature } from "../../interfaces";
import { FeatureTools } from "../../tools";

export const feature = (): IFeature => {
  return FeatureTools.createFeature({
     commandNames: [
       "signup",
     ],
     featurePath: __dirname,
 });
};
