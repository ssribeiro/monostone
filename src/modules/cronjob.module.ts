import * as ast from "@angstone/node-util";
import { BasicModule } from './';
import { CronJob, CronJobParameters } from "cron";
import { ICronjob, IFeatureLoaded } from "../interfaces";

/**
 * Control the cronjobs of server
 */

interface ICronjobState {
  /**
  * list of cronjobs loaded
  */
  cronjobs: CronJob[];
  /**
  * list of cronjobs running now
  */
  runningJobs: boolean[];
}

const state: ICronjobState = {
  cronjobs: [],
  runningJobs: [],
}

const RUNNING_VERIFIER_REST_TIME: number = 50;
/*const DEFAULT_TIMEZONE: string|undefined =
  process.env.CRONJOB_TIMEZONE ||
  process.env.TIMEZONE ||
  undefined;*/

const config = () => {
  ast.log("creating cronjob controller");
    state.cronjobs = []
    state.runningJobs = []
}

/**
 * stop all cronjobs
 */
const stop = async () => {
  ast.log("stoping cronjobs");
  state.cronjobs.forEach((cronjob: CronJob) => {
    cronjob.stop();
  });
  let alldone: boolean = false;
  while (!alldone) {
    alldone = true;
    state.runningJobs.forEach((isRunning: boolean) => {
      if (isRunning) { alldone = false; }
    });
    if (!alldone) { await ast.delay(RUNNING_VERIFIER_REST_TIME); }
  }
  ast.log("cronjobs stoped");
}

/**
 * start all cronjobs
 */
const start = async () => {
  ast.log("starting cronjob controller");
  state.cronjobs.forEach((cronjob: CronJob) => {
    cronjob.start();
  });
  ast.log("cronjobs started");
}

/**
 * load cronjobs
 * @param  features list of the features loaded by server
 */
const loadFeatures = (features: IFeatureLoaded[]) => {
  ast.log("loading cronjobs");

  const cronjobs: ICronjob[] = [];
  features.forEach((feature: IFeatureLoaded) => {
    if (feature.cronjobs) {
      feature.cronjobs.forEach((cronjob: ICronjob) => {
        cronjobs.push(cronjob);
      });
    }
  });

  cronjobs.forEach((jobSheet: ICronjob, jobIndex: number) => {
    state.runningJobs.push(false);
    const cronjob = new CronJob({
      cronTime: jobSheet.cron,
      onTick: () => {
        if (!state.runningJobs[jobIndex]) {
          state.runningJobs[jobIndex] = true;
          try {
            jobSheet.job(() => {
              state.runningJobs[jobIndex] = false;
            });
          } catch (error) {
            if (jobSheet.onError) { jobSheet.onError(error); }
            state.runningJobs[jobIndex] = false;
          }
        }
      },
      // timeZone: this.DEFAULT_TIMEZONE,
    } as CronJobParameters);

    state.cronjobs.push(cronjob);
  });
}

export const CronjobModule = {
  ...BasicModule,
  config,
  loadFeatures,
  start,
  stop
}
