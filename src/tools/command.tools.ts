import * as ast from "@angstone/node-util";
import { ICommand, IRuleSheet } from "../interfaces";

export function createCommand(commandRecipe: {
  commandName: string, featurePath: string }): ICommand {
  const name = commandRecipe.commandName;
  const ruleSheet: IRuleSheet = require(commandRecipe.featurePath + "/" +
    commandRecipe.commandName + "/" + commandRecipe.commandName + ".rule");
  ast.bp(ruleSheet);
  return { name };
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
