import { ICommand, IFeature } from "../interfaces";
import { CommandTools, StringTools } from "./";

export function createFeature(featureRecipe: {
  commandNames: string[],
  featurePath: string,
}): IFeature {
  const featureName: string = StringTools.lastNameOfFilePath(featureRecipe.featurePath);
  const commands: ICommand[] = CommandTools.createCommands({
    commandNames: featureRecipe.commandNames,
    featureName,
    featurePath: featureRecipe.featurePath,
  });
  return { featureName, commands };
}
