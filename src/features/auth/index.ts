import { IFeature } from "../../interfaces";
import { FeatureTools } from "../../tools";
import { UserModelSheet } from "./models/user.model";

export const feature: IFeature = FeatureTools.createFeature({
    commandNames: [
      "signup",
    ],
    featurePath: __dirname,
    modelSheets: [
      UserModelSheet,
    ],
});
