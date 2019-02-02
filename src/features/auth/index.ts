import { IFeature } from "../../interfaces";

import { effect as SendWelcomeEmailEffect } from "./effects/send-welcome-email.effect";

export const feature: IFeature = {
  effects: [ SendWelcomeEmailEffect ],
  featurePath: __dirname,
};
