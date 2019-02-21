import { EventEmitter } from "events";
import { error } from "../error";
import { IReducer, IRule, ICommandLoaded, IEventRead } from "../interfaces";
import { EventTools, ReducerTools, RuleTools, FolderTools } from "./";
import * as sanitizeHtml from 'sanitize-html'

const EVENT_REDUCE_TIMEOUT: number = +(process.env.EVENT_REDUCE_TIMEOUT || 3000);

export async function execute(
  command: ICommandLoaded,
  request: any,
  eventReduced$: EventEmitter
): Promise<any> {

  request = sanitizeRequest(request);

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
      const resolveListener = (eventRead: IEventRead) => {
        if (eventRead.eventNumber === eventNumber) {
          resolve();
          eventReduced$.removeListener(command.commandType, resolveListener);
        }
      };
      eventReduced$.addListener(command.commandType, resolveListener);
      setTimeout(() => {
        eventReduced$.removeListener(command.commandType, resolveListener);
        reject("Server was unable to reduce in time");
      }, EVENT_REDUCE_TIMEOUT);
    });

    return await command.rule.respond(eventNumber, request);
  } else {
    return { eventNumber };
  }
}

export function createCommand(commandRecipe: {
  featureName: string, commandName: string, featurePath: string }): ICommandLoaded {
  let ruleSheet;
  try {
    ruleSheet = require(commandRecipe.featurePath + "/commands/" +
      commandRecipe.commandName + "/" +
      commandRecipe.commandName + ".rule").rule;
  } catch (e) {
    error.fatal(e, "failed to load ruleSheet for command " + commandRecipe.commandName);
  }
  if (!ruleSheet) { error.fatal("failed to load ruleSheet for command " + commandRecipe.commandName); }
  const rule: IRule = RuleTools.loadRule(ruleSheet);
  const reducer: IReducer = ReducerTools.loadReducer({
    commandName: commandRecipe.commandName,
    featurePath: commandRecipe.featurePath,
  });
  return {
    commandType: commandRecipe.featureName + " " + commandRecipe.commandName,
    featureName: commandRecipe.featureName,
    commandName: commandRecipe.commandName,
    rule,
    reducer
  };
}

export function createCommands(
  commandsRecipe:
    {
      featureName: string,
      commandNames: string[],
      featurePath: string
    }
  ): ICommandLoaded[] {

  if(commandsRecipe.commandNames.length == 0) {
    try {
      commandsRecipe.commandNames = FolderTools.getDirectories(
        commandsRecipe.featurePath+'/commands'
      ).map(FolderTools.lastNameOfFilePath);
    } catch(e) {}
  }

  const commands: ICommandLoaded[] = [];
  commandsRecipe.commandNames.forEach((commandName, index) => {
    commands[index] = createCommand({
      commandName,
      featureName: commandsRecipe.featureName,
      featurePath: commandsRecipe.featurePath });
  });

  return commands;

}

export function sanitizeRequest(req: any): any {
  Object.keys(req).forEach( (key) => {
    if ( key != 'token' ) req[key] = sanitizeHtml(req[key]);
  });
  return req;
}
