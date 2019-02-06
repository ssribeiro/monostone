/**
* Controlls the events toolchain
*/

// import * as ast from "@angstone/node-util"
// import { error } from "../error"
import { BasicModule } from './basic.module'
// import { IFeatureLoaded, IEffectLoaded } from '../interfaces'

interface IEffectToRun {
  effectName: string
  effectMethodRun: (eventNumber?: number | undefined, request?: any) => Promise<void>
}

interface IEffectWatcher {
  eventTrigger: string
  effects: IEffectToRun[]
}

interface IEffectModuleStore {
  effectWatchers: IEffectWatcher[]
}

const state: IEffectModuleStore = {
  effectWatchers: []
}

/*
const config = () => {
  state.effectWatchers = []
}

const loadFeatures = (features: IFeatureLoaded[]) => {
/**
 * TODO: create a function to subscribe for the eventTriggers in watchers
 * and a function to resolve all past events (in async start chain)
 /
  features.forEach((feature: IFeatureLoaded) => {
    if(feature.effects) {
      feature.effects.forEach((effect: IEffectLoaded) => {
        if( effect.triggerAfterCommand ) {

          let commandTriggers: string[] = [];
          if( Array.isArray(effect.triggerAfterCommand) )
            commandTriggers = effect.triggerAfterCommand;
          else commandTriggers.push(effect.triggerAfterCommand);

          commandTriggers.forEach((commandTrigger: string) => {

            const alreadyAddedTriggerArray = state.effectWatchers.filter(
              (effectWatcher: IEffectWatcher) => {
                effectWatcher.eventTrigger === commandTrigger;
              });

            let trigger: IEffectWatcher

            if( alreadyAddedTriggerArray.length == 0 ) {

              trigger = {
                eventTrigger: commandTrigger,
                effects: [],
              }

              trigger.effects.push({
                effectName: effect.name,
                effectMethodRun: effect.run,
              })

              state.effectWatchers.push(trigger)
            } else {
              trigger = alreadyAddedTriggerArray[0]

              trigger.effects.push({
                effectName: effect.name,
                effectMethodRun: effect.run,
              })

              state.effectWatchers.map((effectWatcher) => {
                if(effectWatcher.eventTrigger === trigger.eventTrigger) return trigger;
                return effectWatcher;
              })
            }

          })

        }
      })
    }
  })
} */

export const EffectModule = {
  ...BasicModule,
  //config,
  //loadFeatures
}
