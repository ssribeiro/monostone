// import { EventEmitter } from "events";
import { error } from "../error";
import { IView } from "../interfaces";
// import { EventTools, ReducerTools, RuleTools } from "./";

// const EVENT_REDUCE_TIMEOUT: number = +(process.env.EVENT_REDUCE_TIMEOUT || 3000);

// export async function execute(command: ICommand, request: any, eventReduced$: EventEmitter ): Promise<any> {
//
//   let ruleBroken;
//
//   if (command.rule) {
//
//     if (command.rule.preValidation) {
//       ruleBroken = await command.rule.preValidation(request);
//       if (ruleBroken) { return Promise.reject(ruleBroken); }
//     }
//
//     if (command.rule.validation) {
//       ruleBroken = await command.rule.validation(request);
//       if (ruleBroken) { return Promise.reject(ruleBroken); }
//     }
//
//   }
//
//   const eventNumber = await EventTools.send({ command, request});
//
//   if (command.rule && command.rule.respond) {
//
//     await new Promise((resolve, reject) => {
//       const resolveListener = (eventNumberReduced: number) => {
//         if (eventNumberReduced === eventNumber) {
//           resolve();
//           eventReduced$.removeListener("new", resolveListener);
//         }
//       };
//       eventReduced$.addListener("new", resolveListener);
//       setTimeout(() => {
//         eventReduced$.removeListener("new", resolveListener);
//         reject("Server was unable to reduce in time");
//       }, EVENT_REDUCE_TIMEOUT);
//     });
//
//     return await command.rule.respond(eventNumber, request);
//   } else {
//     return { eventNumber };
//   }
// }

export async function renderRequestView(view: IView, data: any): Promise<any> {
  if (view.renderPublic) {
    return await view.renderPublic(data);
  } else {
    return {};
  }
}

export function createView(viewRecipe: {
  featureName: string, featurePath: string, viewName: string }): IView {
  let viewSheet;
  try {
    viewSheet = require(viewRecipe.featurePath + "/" +
      "views/" +
      viewRecipe.viewName + ".view").viewSheet;
  } catch (e) {
    error.fatal("failed to load viewSheet for view " + viewRecipe.viewName, e);
  }
  if (!viewSheet) { error.fatal("failed to load viewSheet for view " + viewRecipe.viewName); }
  return Object.assign({}, viewSheet, { featureName: viewRecipe.featureName, viewName: viewRecipe.viewName }) as IView;
}

export function createViews(viewsRecipe: {
  featureName: string,
  viewNames: string[], featurePath: string }): IView[] {
  const views: IView[] = [];
  viewsRecipe.viewNames.forEach((viewName, index) => {
    views[index] = createView({
      featureName: viewsRecipe.featureName,
      featurePath: viewsRecipe.featurePath,
      viewName });
  });
  return views;
}
