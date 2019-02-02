import * as ast from "@angstone/node-util";
import { CronJob, CronJobParameters } from "cron";
import { ICronjob, IFeatureLoaded } from "./interfaces";

/**
 * Control the cronjobs of server
 */
export class CronjobController {

  /**
   * list of cronjobs loaded
   */
  public cronjobs: CronJob[] = [];

  /**
   * list of cronjobs running now
   */
  public runningJobs: boolean[] = [];
  public RUNNING_VERIFIER_REST_TIME: number = 50;
  public DEFAULT_TIMEZONE: string|undefined =
    process.env.CRONJOB_TIMEZONE ||
    process.env.TIMEZONE ||
    undefined;

  constructor() {
    ast.log("creating cronjob controller");
  }

  /**
   * stop all cronjobs
   */
  public async stop() {
    ast.log("stoping cronjobs");
    this.cronjobs.forEach((cronjob: CronJob) => {
      cronjob.stop();
    });
    let alldone: boolean = false;
    while (!alldone) {
      alldone = true;
      this.runningJobs.forEach((isRunning: boolean) => {
        if (isRunning) { alldone = false; }
      });
      if (!alldone) { await ast.delay(this.RUNNING_VERIFIER_REST_TIME); }
    }
    ast.log("cronjobs stoped");
  }

  /**
   * start all cronjobs
   */
  public async start() {
    ast.log("starting cronjob controller");
    this.cronjobs.forEach((cronjob: CronJob) => {
      cronjob.start();
    });
    ast.log("cronjobs started");
  }

  /**
   * load cronjobs
   * @param  features list of the features loaded by server
   */
  public loadCronjobs(features: IFeatureLoaded[]) {
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
      this.runningJobs.push(false);
      const cronjob = new CronJob({
        cronTime: jobSheet.cron,
        onTick: () => {
          if (!this.runningJobs[jobIndex]) {
            this.runningJobs[jobIndex] = true;
            try {
              jobSheet.job(() => {
                this.runningJobs[jobIndex] = false;
              });
            } catch (error) {
              if (jobSheet.onError) { jobSheet.onError(error); }
              this.runningJobs[jobIndex] = false;
            }
          }
        },
        // timeZone: this.DEFAULT_TIMEZONE,
      } as CronJobParameters);

      this.cronjobs.push(cronjob);
    });
  }

}
