import { IFeature } from "../../interfaces";

import { cronjob as CleanupExpiredAuthenticationsJob } from "./cronjobs/cleanup-expired-authentications.cron";
import { effect as SendWelcomeEmailEffect } from "./effects/send-welcome-email.effect";

export const feature: IFeature = {
  commandNames: [ "signup", "login" ],
  viewNames: [ "userlist", "session" ],
  cronjobs: [ CleanupExpiredAuthenticationsJob ],
  effects: [ SendWelcomeEmailEffect ],
  featurePath: __dirname,
};
