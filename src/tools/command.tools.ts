import { ICommand, IRuleSheet } from "../interfaces";
import { RuleTools } from "./";

export function createCommand(commandRecipe: {
  commandName: string, featurePath: string }): ICommand {
  const ruleSheet: IRuleSheet = require(commandRecipe.featurePath + "/" +
    commandRecipe.commandName + "/" + commandRecipe.commandName + ".rule").ruleSheet;
  const rule: IRuleSheet = RuleTools.loadRule(ruleSheet);
  return { commandName: commandRecipe.commandName, rule };
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
