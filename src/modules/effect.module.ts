/**
* Controlls the events toolchain
*/

import * as ast from "@angstone/node-util"
import { error } from "../error"
import { BasicModule, EventModule } from './'
import { db } from "store"
import { IFeatureLoaded, IEffectLoaded, IEventRead } from '../interfaces'

interface IEffectToRun {
  effectName: string
  effectMethodRun: (eventNumber?: number | undefined, request?: any) =>
    Promise<void>
}

interface IEffectWatcher {
  eventTrigger: string
  effects: IEffectToRun[]
}

interface IEffectToSolve {
  effectName: string
  effectMethod: (eventNumber?: number | undefined, request?: any) =>
    Promise<void>
  eventRead: IEventRead
}

interface IEffectModuleState {
  effectWatchers: IEffectWatcher[]
  firstEventNumberToEffect: number
  effectsToSolve: IEffectToSolve[]
  moduleStopped: boolean
  solving: boolean
  lastTimeSolving: number
}

const EFFECT_CONTROLLER_NAME: string = "effect_control"
const EFFECT_REST_TIME: number = 10

const state: IEffectModuleState = {
  effectWatchers: [],
  firstEventNumberToEffect: 0,
  effectsToSolve: [],
  moduleStopped: false,
  solving: false,
  lastTimeSolving: Date.now(),
}

const config = () => {
  state.effectWatchers = []
  state.firstEventNumberToEffect = 0
  state.effectsToSolve = []
  state.moduleStopped = false
  state.solving = false
  state.lastTimeSolving = Date.now()
}

const loadFeatures = (features: IFeatureLoaded[]) => {

  features.forEach((feature: IFeatureLoaded) => {
    if(feature.effects) {
      feature.effects.forEach((effect: IEffectLoaded) => {
        loadEffectsAfterCommands(effect)
      })
    }
  })
}

const loadEffectsAfterCommands = (effect: IEffectLoaded) => {
  if( effect.triggerAfterCommand ) {

    let commandTriggers: string[] = [];
    if( Array.isArray(effect.triggerAfterCommand) )
      commandTriggers = effect.triggerAfterCommand;
    else commandTriggers.push(effect.triggerAfterCommand);

    commandTriggers.forEach((commandTrigger: string) => {

      makeShureTriggerIsSigned(commandTrigger)

      state.effectWatchers.map((effectWatcher) => {
        if(effectWatcher.eventTrigger === commandTrigger) {
          effectWatcher.effects.push({
            effectName: effect.name,
            effectMethodRun: effect.run,
          })
        }
        return effectWatcher
      })

    })

  }
}

const makeShureTriggerIsSigned = (commandTrigger: string) => {
  const alreadyAddedTriggerArray = state.effectWatchers.filter(
    (effectWatcher: IEffectWatcher) => {
      effectWatcher.eventTrigger === commandTrigger
    })

  if( alreadyAddedTriggerArray.length == 0 ) {
    const effectWatcher: IEffectWatcher = {
      eventTrigger: commandTrigger,
      effects: [],
    }
    state.effectWatchers.push(effectWatcher)
  }
}

const start = async () => {
  fullfillStackOfEffectsToSolve()
  solve()
}

const stop = async () => {
  state.moduleStopped = true
  while ( ! await isFree() ) { await ast.delay(EFFECT_REST_TIME) }
}

const fullfillStackOfEffectsToSolve = () => {
  state.effectWatchers.forEach(effectWatcher => {
    EventModule.getEventReadStream().addListener(
      effectWatcher.eventTrigger, (eventRead: IEventRead) => {
        if(eventRead.eventNumber > state.firstEventNumberToEffect) {
          effectWatcher.effects.forEach(effect => {
            state.effectsToSolve.push({
              effectName: effect.effectName,
              effectMethod: effect.effectMethodRun,
              eventRead,
            })
          })
        }
    })
  })
}

const solve = async () => {
  while (state.effectsToSolve.length !== 0 && !state.moduleStopped) {

    

  }
  await ast.delay(EFFECT_REST_TIME)
  if ( !state.moduleStopped ) { solve() }
}

const getFirstEventNumberToEffect = async (): Promise<number> => {
  await registerDbControl()
  return state.firstEventNumberToEffect
}

/**
 * Register the control data on database. This is necessary to coordinate
 * and grant stability and roughness to the system
 */
const registerDbControl = async () => {
  ast.log("registering db control for effects")
  const oldRegister: any = await db.collection(EFFECT_CONTROLLER_NAME)
    .find({id: EFFECT_CONTROLLER_NAME}).toArray()

  if (oldRegister.length === 0) {
    await db.collection(EFFECT_CONTROLLER_NAME)
      .insertOne({
         id: EFFECT_CONTROLLER_NAME,
         startEvent: 0,
       })
    state.firstEventNumberToEffect = 0
  } else state.firstEventNumberToEffect = oldRegister[0].startEvent
}

const isFree = async (): Promise<boolean> => {
  if (state.solving) return false
  else {
    if ((Date.now() - state.lastTimeSolving) > 3 * EFFECT_REST_TIME)
      return !state.solving
    return false
  }
}

export const EffectModule = {
  ...BasicModule,
  config,
  loadFeatures,
  getFirstEventNumberToEffect
}
