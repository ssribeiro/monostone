import { error } from "../error";
import { IAuthToken } from "../features/auth/auth-token.i";
import { IView } from "../interfaces";

export async function renderRequestView(view: IView, data: any, token?: IAuthToken|undefined): Promise<any|undefined> {
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
  featureName: string, featurePath: string, viewName: string }): IView {
  let viewSheet;
  try {
    viewSheet = require(viewRecipe.featurePath + "/" +
      "views/" +
      viewRecipe.viewName + ".view").viewSheet;
  } catch (e) {
    error.fatal(e, "failed to load viewSheet for view " + viewRecipe.viewName);
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
