import { error } from "../error";
import { ICommand, IRuleSheet } from "../interfaces";
import { RuleTools } from "./";

const commandRequestFunction = function(req: any): Promise<any> {
  return new Promise<any>((resolve) => {
    resolve("beijinho");
  });
};

export function createCommand(commandRecipe: {
  commandName: string, featurePath: string }): ICommand {
  let ruleSheet;
  try {
    ruleSheet = require(commandRecipe.featurePath + "/" +
      commandRecipe.commandName + "/" +
      commandRecipe.commandName + ".rule").ruleSheet;
  } catch (e) {
    error.fatal("failed to load ruleSheet for command " + commandRecipe.commandName);
  }
  if (!ruleSheet) { error.fatal("failed to load ruleSheet for command " + commandRecipe.commandName); }
  const rule: IRuleSheet = RuleTools.loadRule(ruleSheet);
  return { commandName: commandRecipe.commandName, rule, request: commandRequestFunction };
}

export function createCommands(commandsRecipe: {
  commandNames: string[], featurePath: string }): ICommand[] {
  const commands: ICommand[] = [];
  commandsRecipe.commandNames.forEach((commandName, index) => {
    commands[index] = createCommand({
      commandName, featurePath: commandsRecipe.featurePath });
  });
  return commands;
}
