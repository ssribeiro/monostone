
import * as ast from "@angstone/node-util";
import { CronJob, CronJobParameters } from "cron";
import { ICronjob, IFeature } from "./interfaces";

export class CronjobController {

  public cronjobs: CronJob[] = [];
  public runningJobs: boolean[] = [];
  public RUNNING_VERIFIER_REST_TIME: number = 50;
  public DEFAULT_TIMEZONE: string|undefined =
    process.env.CRONJOB_TIMEZONE ||
    process.env.TIMEZONE ||
    undefined;

  constructor() {
    ast.log("creating cronjob controller");
  }

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

  public async start() {
    ast.log("starting cronjob controller");
    this.cronjobs.forEach((cronjob: CronJob) => {
      cronjob.start();
    });
    ast.log("cronjobs started");
  }

  public loadCronjobs(features: IFeature[]) {
    ast.log("loading cronjobs");

    const cronjobs: ICronjob[] = [];
    features.forEach((feature: IFeature) => {
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
