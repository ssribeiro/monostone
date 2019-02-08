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

  const namesRepeated: string[] = [];
  return featureLoadeds.filter((featureLoaded: IFeatureLoaded) => {
    const alreadyAdded = namesRepeated.filter((name) => name == featureLoaded.featureName)
    if( alreadyAdded.length == 0 ) {
      namesRepeated.push(featureLoaded.featureName)
      return true
    } else return false
  });
}

export function getRecipesFromFolderStructure(customPath?: string | undefined): IFeature[] {
  const featuresDir: string = customPath || __dirname+'/../features'
  return FolderTools.getDirectories( featuresDir ).map((featurePath: string) => {
    return { featurePath } as IFeature;
  });
}
