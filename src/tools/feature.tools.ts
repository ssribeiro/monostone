import { ICommand, IFeature, IFeatureLoaded, IViewLoaded } from "../interfaces";
import { CommandTools, StringTools, ViewTools } from "./";

export function createFeature(featureRecipe: IFeature): IFeatureLoaded {
  const featureName: string = StringTools.lastNameOfFilePath(featureRecipe.featurePath);
  const commands: ICommand[] = CommandTools.createCommands({
    commandNames: featureRecipe.commandNames || [],
    featureName,
    featurePath: featureRecipe.featurePath,
  });
  const views: IViewLoaded[] = ViewTools.createViews({
    featureName,
    featurePath: featureRecipe.featurePath,
    viewNames: featureRecipe.viewNames || [],
  });
  return { featureName, commands, views, cronjobs: featureRecipe.cronjobs };
}

export function createFeatures(featureRecipes: IFeature[]): IFeatureLoaded[] {
  const featureLoadeds: IFeatureLoaded[] = [];
  featureRecipes.forEach( featureRecipe => {
    featureLoadeds.push( createFeature(featureRecipe) );
  })
  return featureLoadeds;
}
