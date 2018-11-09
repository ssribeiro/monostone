// import { IReducer, IRuleSheet } from "./";

export interface ICronjob {
  cron: string;
  job: (onComplete: () => void) => void;
  onError?: (error?: any) => void;
}
