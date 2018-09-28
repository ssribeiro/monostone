import { IFeature } from "../interfaces";
import { CommandTools, ModelTools, StringTools } from "./";

export function createFeature(featureRecipe: { commandNames: string[], featurePath: string }): IFeature {
  const name = StringTools.lastNameOfFilePath(featureRecipe.featurePath);
  const models = ModelTools.lookForModels(featureRecipe.featurePath);
  const commands = CommandTools.createCommands({
    commandNames: featureRecipe.commandNames,
    featurePath: featureRecipe.featurePath,
  });
  return { name, models, commands };
}
