import { ICommand, IFeature, IModelSheet } from "../interfaces";
import { CommandTools, ModelTools, StringTools } from "./";

export function createFeature(featureRecipe: {
  commandNames: string[],
  featurePath: string,
  modelSheets?: IModelSheet[],
}): IFeature {
  const featureName: string = StringTools.lastNameOfFilePath(featureRecipe.featurePath);
  if (featureRecipe.modelSheets) { ModelTools.loadModels(featureRecipe.modelSheets); }
  const commands: ICommand[] = CommandTools.createCommands({
    commandNames: featureRecipe.commandNames,
    featureName,
    featurePath: featureRecipe.featurePath,
  });
  return { featureName, commands };
}
