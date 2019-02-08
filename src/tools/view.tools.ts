import { error } from "../error";
import { IViewLoaded } from "../interfaces";
import { FolderTools, StringTools } from './';

export function createView(viewRecipe: {
  featureName: string, featurePath: string, viewName: string }): IViewLoaded {
  let viewSheet;
  try {
    viewSheet = require(viewRecipe.featurePath + "/" +
      "views/" +
      viewRecipe.viewName + ".view").view;
  } catch (e) {
    error.fatal(e, "failed to load viewSheet for view " + viewRecipe.viewName);
  }
  if (!viewSheet) { error.fatal("failed to load viewSheet for view " + viewRecipe.viewName,
    "Did you exported it named as 'view' using 'IView' interface?"); }
  return Object.assign({}, viewSheet, {
    featureName: viewRecipe.featureName,
    viewName: viewRecipe.viewName,
    viewTag: viewRecipe.featureName + ' ' + viewRecipe.viewName
  }) as IViewLoaded;
}

export function createViews(
  viewsRecipe: {
    featureName: string,
    viewNames: string[],
    featurePath: string
  }): IViewLoaded[] {

  if(viewsRecipe.viewNames.length == 0) {
    viewsRecipe.viewNames = FolderTools.getFiles( viewsRecipe.featurePath+'/views' )
    .filter(StringTools.filters.lastCharactersMustBe('ts'))
    .map(FolderTools.firstNameOfFile);
  }

  const views: IViewLoaded[] = [];
  viewsRecipe.viewNames.forEach((viewName, index) => {
    views[index] = createView({
      featureName: viewsRecipe.featureName,
      featurePath: viewsRecipe.featurePath,
      viewName });
  });
  return views;
}
