import { EventEmitter } from "events";
import { error } from "../error";
import { ICommand, IReducer, IRule } from "../interfaces";
import { EventTools, ReducerTools, RuleTools } from "./";

const EVENT_REDUCE_TIMEOUT: number = +(process.env.EVENT_REDUCE_TIMEOUT || 3000);

export async function execute(command: ICommand, request: any, eventReduced$: EventEmitter ): Promise<any> {

  let ruleBroken;

  if (command.rule) {

    if (command.rule.preValidation) {
      ruleBroken = await command.rule.preValidation(request);
      if (ruleBroken) { return Promise.reject(ruleBroken); }
    }

    if (command.rule.validation) {
      const ruleBrokenOrNewRequest = await command.rule.validation(request);
      if (ruleBrokenOrNewRequest) {
        if (typeof ruleBrokenOrNewRequest === "string") {
          return Promise.reject(ruleBrokenOrNewRequest);
        } else {
          request = ruleBrokenOrNewRequest.req;
        }
      }
    }

  }

  const eventNumber = await EventTools.send({ command, request});

  if (command.rule && command.rule.respond) {

    await new Promise((resolve, reject) => {
      const resolveListener = (eventNumberReduced: number) => {
        if (eventNumberReduced === eventNumber) {
          resolve();
          eventReduced$.removeListener("new", resolveListener);
        }
      };
      eventReduced$.addListener("new", resolveListener);
      setTimeout(() => {
        eventReduced$.removeListener("new", resolveListener);
        reject("Server was unable to reduce in time");
      }, EVENT_REDUCE_TIMEOUT);
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
    ruleSheet = require(commandRecipe.featurePath + "/commands/" +
      commandRecipe.commandName + "/" +
      commandRecipe.commandName + ".rule").ruleSheet;
  } catch (e) {
    error.fatal(e, "failed to load ruleSheet for command " + commandRecipe.commandName);
  }
  if (!ruleSheet) { error.fatal("failed to load ruleSheet for command " + commandRecipe.commandName); }
  const rule: IRule = RuleTools.loadRule(ruleSheet);
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
