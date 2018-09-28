import { IFeature } from "../../interfaces";
import { FeatureTools } from "../../tools";

export const feature: IFeature = FeatureTools.createFeature({
    commandNames: [
      "signup",
    ],
    featurePath: __dirname,
});
