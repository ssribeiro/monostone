import { ICommand, IFeature, IModel } from "../interfaces";
import { CommandTools, ModelTools, StringTools } from "./";

export function createFeature(featureRecipe: {
  commandNames: string[],
  featurePath: string,
}): IFeature {
  const featureName = StringTools.lastNameOfFilePath(featureRecipe.featurePath);
  const models: IModel[] = ModelTools.lookForModels(featureRecipe.featurePath);
  const commands: ICommand[] = CommandTools.createCommands({
    commandNames: featureRecipe.commandNames,
    featurePath: featureRecipe.featurePath,
  });
  return { featureName, models, commands };
}
