import { ICommand } from "./interfaces";

const featureName = "system";

export const started: ICommand = { commandName: "started", featureName };
export const apiOpened: ICommand = { commandName: "apiOpened", featureName };
