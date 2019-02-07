// import * as ast from "@angstone/node-util";

import { ICronjob } from "../../../interfaces";
import { db } from "../../../store";

export const cronjob: ICronjob = {
  cron: "* * * * * *", // every second
  job: (onComplete: () => void) => {
    // console.log(Date.now());
    db.collection("authentication").deleteMany({
      expiresAt: {
        $lt: Date.now(),
      },
    }).then(() => onComplete());
  },
};
