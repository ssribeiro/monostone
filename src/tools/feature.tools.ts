import { ICommandLoaded, IFeature, IFeatureLoaded, IViewLoaded, ICronjob, IEffectLoaded } from "../interfaces";
import { CommandTools, EffectTools, StringTools, ViewTools, CronjobTools, FolderTools } from "./";

export function createFeature(featureRecipe: IFeature): IFeatureLoaded {
  const featureName: string = StringTools.lastNameOfFilePath(featureRecipe.featurePath);
  const commands: ICommandLoaded[] = CommandTools.createCommands({
    commandNames: featureRecipe.commandNames || [],
    featureName,
    featurePath: featureRecipe.featurePath,
  });
  const views: IViewLoaded[] = ViewTools.createViews({
    featureName,
    featurePath: featureRecipe.featurePath,
    viewNames: featureRecipe.viewNames || [],
  });
  const cronjobs: ICronjob[] = CronjobTools.createCronjobs({
    featureName,
    featurePath: featureRecipe.featurePath,
    cronjobs: featureRecipe.cronjobs || [],
  });
  const effects: IEffectLoaded[] = EffectTools.createEffects({
    featureName,
    featurePath: featureRecipe.featurePath,
    effects: featureRecipe.effects || [],
  });
  return { featureName, commands, views, cronjobs, effects };
}

export function createFeatures(featureRecipes: IFeature[]): IFeatureLoaded[] {
  const featureLoadeds: IFeatureLoaded[] = [];
  featureRecipes.forEach( featureRecipe => {
    featureLoadeds.push( createFeature(featureRecipe) );
  })
  return featureLoadeds;
}

export function getRecipesFromFolderStructure(): IFeature[] {
  return FolderTools.getDirectories( __dirname+'/../features' ).map((featurePath: string) => {
    return { featurePath } as IFeature;
  });
}
