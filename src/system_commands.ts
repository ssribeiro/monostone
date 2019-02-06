import { ICommand } from "./interfaces";

const featureName = "system";

export const starting: ICommand = { commandName: "starting", featureName };
export const started: ICommand = { commandName: "started", featureName };
export const apiOpened: ICommand = { commandName: "apiOpened", featureName };
export const effectDone: ICommand = { commandName: "effectDone", featureName };
export const effectFailed: ICommand = { commandName: "effectFailed", featureName };
