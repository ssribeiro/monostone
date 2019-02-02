import { error } from "../error";
import { IAuthToken } from "../features/auth/interfaces/auth-token.i";
import { IViewLoaded } from "../interfaces";

export async function renderRequestView(view: IViewLoaded, data: any, token?: IAuthToken|undefined): Promise<any|undefined> {
  if (view.renderPrivate && !view.renderPublic) {
    if (token) {
      return await view.renderPrivate(data, token);
    } else {
      return undefined;
    }
  } else if (view.renderPrivate && view.renderPublic) {
    if (token) {
      return await view.renderPrivate(data, token);
    } else {
      return await view.renderPublic(data);
    }
  } else {
    if (view.renderPublic) {
      return await view.renderPublic(data);
    } else {
      return {};
    }
  }
}

export function createView(viewRecipe: {
  featureName: string, featurePath: string, viewName: string }): IViewLoaded {
  let viewSheet;
  try {
    viewSheet = require(viewRecipe.featurePath + "/" +
      "views/" +
      viewRecipe.viewName + ".view").viewSheet;
  } catch (e) {
    error.fatal(e, "failed to load viewSheet for view " + viewRecipe.viewName);
  }
  if (!viewSheet) { error.fatal("failed to load viewSheet for view " + viewRecipe.viewName); }
  return Object.assign({}, viewSheet, { featureName: viewRecipe.featureName, viewName: viewRecipe.viewName }) as IViewLoaded;
}

export function createViews(viewsRecipe: {
  featureName: string,
  viewNames: string[], featurePath: string }): IViewLoaded[] {
  const views: IViewLoaded[] = [];
  viewsRecipe.viewNames.forEach((viewName, index) => {
    views[index] = createView({
      featureName: viewsRecipe.featureName,
      featurePath: viewsRecipe.featurePath,
      viewName });
  });
  return views;
}
