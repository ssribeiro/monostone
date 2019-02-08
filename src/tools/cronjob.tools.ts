import { ICronjob } from '../interfaces';
import { FolderTools, StringTools } from './';
import { error } from "../error";

export function createCronjob(
  cronjobRecipe: {
    featurePath: string,
    cronjobName: string
  }
): ICronjob {
  let cronjob;
  try {
    cronjob = require(cronjobRecipe.featurePath + "/cronjobs/" +
      cronjobRecipe.cronjobName + ".cron").cronjob;
  } catch (e) {
    error.fatal(e, "failed to load cronjob " + cronjobRecipe.cronjobName);
  }
  if (!cronjob) { error.fatal("failed to load cronjob " + cronjobRecipe.cronjobName); }
  return cronjob as ICronjob;
}

export function createCronjobs(
  cronjobsRecipe: {
    featureName: string,
    cronjobs: ICronjob[],
    featurePath: string
  }): ICronjob[] {

  if(cronjobsRecipe.cronjobs.length == 0) {
    try {
      const cronjobNames: string[] = FolderTools.getFiles( cronjobsRecipe.featurePath+'/cronjobs' )
        .filter(StringTools.filters.lastCharactersMustBe('ts'))
        .map(FolderTools.firstNameOfFileSeparatedBySlashes);

      cronjobsRecipe.cronjobs = cronjobNames.map(cronjobName => createCronjob( { cronjobName, featurePath: cronjobsRecipe.featurePath }));
    } catch(e) {}
  }

  return cronjobsRecipe.cronjobs;
}
