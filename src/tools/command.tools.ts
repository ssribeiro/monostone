import { EventEmitter } from "events";
import { error } from "../error";
import { ICommand, IReducer, IRuleSheet } from "../interfaces";
import { EventTools, ReducerTools, RuleTools } from "./";

export async function execute(command: ICommand, request: any, eventReduced$: EventEmitter ): Promise<any> {

  let ruleBroken;

  if (command.rule) {

    if (command.rule.preValidation) {
      ruleBroken = await command.rule.preValidation(request);
      if (ruleBroken) { return Promise.reject(ruleBroken); }
    }

    if (command.rule.validation) {
      ruleBroken = await command.rule.validation(request);
      if (ruleBroken) { return Promise.reject(ruleBroken); }
    }

  }

  const eventNumber = await EventTools.send({ command, request});

  if (command.rule && command.rule.respond) {

    await new Promise((resolve) => {
      eventReduced$.addListener("new", (eventNumberReduced: number) => {
        if (eventNumberReduced === eventNumber) { resolve(); }
      });
    });

    return await command.rule.respond(eventNumber, request);
  } else {
    return { eventNumber };
  }
}

export function createCommand(commandRecipe: {
  featureName: string, commandName: string, featurePath: string }): ICommand {
  let ruleSheet;
  try {
    ruleSheet = require(commandRecipe.featurePath + "/" +
      commandRecipe.commandName + "/" +
      commandRecipe.commandName + ".rule").ruleSheet;
  } catch (e) {
    error.fatal("failed to load ruleSheet for command " + commandRecipe.commandName, e);
  }
  if (!ruleSheet) { error.fatal("failed to load ruleSheet for command " + commandRecipe.commandName); }
  const rule: IRuleSheet = RuleTools.loadRule(ruleSheet);
  const reducer: IReducer = ReducerTools.loadReducer({
    commandName: commandRecipe.commandName,
    featurePath: commandRecipe.featurePath,
  });
  return { featureName: commandRecipe.featureName, commandName: commandRecipe.commandName, rule, reducer };
}

export function createCommands(commandsRecipe: {
  featureName: string,
  commandNames: string[], featurePath: string }): ICommand[] {
  const commands: ICommand[] = [];
  commandsRecipe.commandNames.forEach((commandName, index) => {
    commands[index] = createCommand({
      commandName,
      featureName: commandsRecipe.featureName,
      featurePath: commandsRecipe.featurePath });
  });
  return commands;
}
