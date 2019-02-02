import { IFeature } from "../../interfaces";
import { FeatureTools } from "../../tools";

import { cronjob as CleanupExpiredAuthenticationsJob } from "./cronjobs/cleanup-expired-authentications.cron";
import { effect as SendWelcomeEmailEffect } from "./effects/send-welcome-email.effect";

export const feature = (): IFeature => {
  return FeatureTools.createFeature({
     commandNames: [
       "signup",
       "login",
     ],
     cronjobs: [
       CleanupExpiredAuthenticationsJob,
     ],
     effects: [
       SendWelcomeEmailEffect,
     ],
     featurePath: __dirname,
     viewNames: [
       "userlist",
       "session",
     ],
 });
};
