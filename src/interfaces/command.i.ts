import { IRuleSheet } from "./";

export interface ICommand {
  commandName: string;
  rule: IRuleSheet;
  request: (req: any) => Promise<any>;
}
