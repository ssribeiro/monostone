import { ICommand, ICronjob, IFeature, IView } from "../interfaces";
import { CommandTools, StringTools, ViewTools } from "./";

export function createFeature(featureRecipe: {
  commandNames: string[],
  featurePath: string,
  viewNames: string[],
  cronjobs: ICronjob[],
}): IFeature {
  const featureName: string = StringTools.lastNameOfFilePath(featureRecipe.featurePath);
  const commands: ICommand[] = CommandTools.createCommands({
    commandNames: featureRecipe.commandNames,
    featureName,
    featurePath: featureRecipe.featurePath,
  });
  const views: IView[] = ViewTools.createViews({
    featureName,
    featurePath: featureRecipe.featurePath,
    viewNames: featureRecipe.viewNames,
  });
  return { featureName, commands, views, cronjobs: featureRecipe.cronjobs };
}
