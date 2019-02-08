import * as uuid from 'uuid';
import { IEffect, IEffectLoaded } from '../interfaces';
import { FolderTools, StringTools } from './';
import { error } from "../error";

export function createEffect(
  effectRecipe: {
    featurePath: string,
    effectName: string
  }
): IEffectLoaded {
  let effect;
  try {
    effect = require(effectRecipe.featurePath + "/effects/" +
      effectRecipe.effectName + ".effect").effect;
  } catch (e) {
    error.fatal(e, "failed to load effect " + effectRecipe.effectName);
  }
  if (!effect) { error.fatal("failed to load effect " + effectRecipe.effectName); }

  if (!effect.name) effect.name = effectRecipe.effectName;
  return effect as IEffectLoaded;
}

export function createEffects(
  effectsRecipe: {
    featureName: string,
    effects: IEffect[],
    featurePath: string
  }): IEffectLoaded[] {

  if(effectsRecipe.effects.length == 0) {
    try {
      const effectNames: string[] = FolderTools.getFiles( effectsRecipe.featurePath+'/effects' )
      .filter(StringTools.filters.lastCharactersMustBe('ts'))
      .map(FolderTools.firstNameOfFileSeparatedBySlashes)
      .filter(effectName =>
        process.env.NODE_ENV == 'development' || !StringTools.stringStartWith(effectName, 'fake')
      );

      effectsRecipe.effects = effectNames.map(effectName => createEffect( { effectName, featurePath: effectsRecipe.featurePath }));
    } catch(e) {}
  }

  return effectsRecipe.effects.map((effect: IEffect) => {
    effect.name = effect.name || ('unknown.'+ uuid() +'.effect');
    return effect as IEffectLoaded;
  });

}
