import { IFeature } from "../../interfaces";
import { FeatureTools } from "../../tools";

import { cronjob as CleanupExpiredAuthenticationsJob } from "./cronjobs/cleanup-expired-authentications.cron";

export const feature = (): IFeature => {
  return FeatureTools.createFeature({
     commandNames: [
       "signup",
       "login",
     ],
     featurePath: __dirname,
     viewNames: [
       "userlist",
       "session",
     ],
     cronjobs: [
       CleanupExpiredAuthenticationsJob,
     ],
 });
};
