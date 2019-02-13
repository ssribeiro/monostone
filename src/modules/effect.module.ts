/**
* Controlls the events toolchain
*/

import * as ast from "@angstone/node-util"
import * as asyncFunctions from 'async'
import { error } from "../error"
import { BasicModule, EventModule } from './'
import { db } from "../store"
import { IFeatureLoaded, IEffectLoaded, IEventRead } from '../interfaces'
import { EventTools } from '../tools'
import * as SystemCommands from '../system_commands'

interface IEffectToRun {
  effectName: string
  effectMethodRun: (eventNumber: number, request: any) =>
    Promise<void>
}

interface IEffectWatcher {
  eventTrigger: string
  effects: IEffectToRun[]
}

interface IEffectToSolve {
  effectName: string
  effectMethod: (eventNumber: number, request: any) =>
    Promise<void>
  eventRead: IEventRead
  attempts: number
}

interface IEffectDoneInfo {
  eventNumber: number
  effectName: string
}

interface IEffectFailedInfo extends IEffectDoneInfo {
  attempts: number
}

interface IEffectModuleState {
  effectWatchers: IEffectWatcher[]
  firstEventNumberToEffect: number
  effectsToSolve: IEffectToSolve[]
  moduleStopped: boolean
  solving: boolean
  lastTimeSolving: number
}

const EFFECT_CONTROLLER_NAME: string = "effect_control";
const EFFECT_REST_TIME: number = 100;
const MAX_TASKS_AT_TIME: number = 30;
const MAX_TASK_ATTEMPTS: number = 3
const TIME_BETWEEN_ATTEMPTS: number = 250
const STACK_FULLFILL_STABILITY_REST_TIME: number = 100
  // process.env.NODE_ENV == 'development' ? 10 : 200
const EFFECT_DONE_EVENT_TYPE: string =
  SystemCommands.effectDone.featureName + ' ' +
  SystemCommands.effectDone.commandName;
const EFFECT_FAILED_EVENT_TYPE: string =
  SystemCommands.effectFailed.featureName + ' ' +
  SystemCommands.effectFailed.commandName;
const POSSIBILY_DOUBLE_EFFECT_ERROR: string =
  `error sending confirmation of effect to event store.
  It is posible that you endup with a double execution of effect:
  `;
const EFFECT_SOLVING_ERROR_MESSAGE: string =
  `error solving effect:
  `;

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
            effectMethodRun: effect.run
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

  await EventModule.awaitStreamInLive()

  await fullfillOfStackOfEffectsToSolveStability()

  const listenerDone = removeFromStackSolvedEvents()
  const listenerFailed = removeFromStackFailedEvents()

  await fullfillOfStackOfEffectsToSolveStability()

  removeListenerToSolvedEvents(listenerDone)
  removeListenerToFailedEvents(listenerFailed)

  solve()
}

const stop = async () => {
  state.moduleStopped = true
  while ( ! await isFree() ) { await ast.delay(EFFECT_REST_TIME) }
}

const fullfillOfStackOfEffectsToSolveStability = async () => {
  const lengthNow = state.effectsToSolve.length
  const lengthAfterRestTime = await new Promise<number>((resolve) => {
    setTimeout(() => {
      resolve(state.effectsToSolve.length)
    }, STACK_FULLFILL_STABILITY_REST_TIME)
  })
  if( lengthNow != lengthAfterRestTime )
    await fullfillOfStackOfEffectsToSolveStability()
}

const removeListenerToSolvedEvents = (listenerDone: any) => {
  EventModule.getEventReadStream().removeListener(
    EFFECT_DONE_EVENT_TYPE, listenerDone);
}

const removeListenerToFailedEvents = (listenerFailed: any) => {
  EventModule.getEventReadStream().removeListener(
    EFFECT_FAILED_EVENT_TYPE, listenerFailed);
}

const removeFromStackSolvedEvents = (): any => {
  const resolveDoneListener = (eventRead: IEventRead) => {

    const effectDoneInfo: IEffectDoneInfo
      = eventRead.request as IEffectDoneInfo

    const effectDoneInStackArray: IEffectToSolve[]
      = state.effectsToSolve.filter(effectToSolve => {
      return effectToSolve.eventRead.eventNumber
        == effectDoneInfo.eventNumber
    })

    if(effectDoneInStackArray.length != 0)
      takeEffectFromToSolveStack(effectDoneInStackArray[0])
  }

  EventModule.getEventReadStream().addListener( EFFECT_DONE_EVENT_TYPE,
    resolveDoneListener )

  return resolveDoneListener
}

const removeFromStackFailedEvents = (): any => {
  const resolveFailedListener = (eventRead: IEventRead) => {

    const effectFailedInfo: IEffectFailedInfo
      = eventRead.request as IEffectFailedInfo

    const effectFailedInStackArray: IEffectToSolve[]
      = state.effectsToSolve.filter(effectToSolve => {
      return effectToSolve.eventRead.eventNumber
        == effectFailedInfo.eventNumber
    })

    if(effectFailedInStackArray.length != 0)
      takeEffectFromToSolveStack(effectFailedInStackArray[0])
  }

  EventModule.getEventReadStream().addListener( EFFECT_FAILED_EVENT_TYPE,
    resolveFailedListener )

  return resolveFailedListener
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
              attempts: 0,
            })
          })
        }
    })
  })
}

const solve = async () => {
  // console.log('solve called at '+Date.now())

  if(
    state.effectsToSolve.length !== 0 &&
    !state.moduleStopped &&
    !state.solving
  ) {
    // console.log('effectsToSolve before the solve '+Date.now())
    // console.log(state.effectsToSolve)
    state.solving = true

    await new Promise<void>((resolveParallel) => {
      asyncFunctions.parallelLimit(
        state.effectsToSolve.map(effectToSolve => (callback: (e: any) => void ) => {
          effectToSolve.effectMethod(
            effectToSolve.eventRead.eventNumber,
            effectToSolve.eventRead.request
          ).then(() => {
            const request: IEffectDoneInfo = {
              eventNumber: effectToSolve.eventRead.eventNumber,
              effectName: effectToSolve.effectName
            }
            EventTools.send({
              command: SystemCommands.effectDone, request
            }).then(() => {
              // console.log('solved '+effectToSolve.eventRead.eventNumber+' at '+Date.now())
              takeEffectFromToSolveStack(effectToSolve)
              // console.log('effectsToSolve after this solve')
              // console.log(state.effectsToSolve)
              callback(null)
            }).catch((sendError: Error | string) => {
              dealWithDoubleEffectError(effectToSolve, sendError)
              callback(null)
            })
          }).catch((e: any) => {
            dealWithSolvingError(effectToSolve, e)
            if(effectToSolve.attempts < MAX_TASK_ATTEMPTS) {
              countEffectToSolveAttempt(effectToSolve)
              takeEffectFromToSolveStack(effectToSolve)

              setTimeout(() => {
                putEffectInSolveStack(effectToSolve)
              }, TIME_BETWEEN_ATTEMPTS)

              callback(null)
            } else {
              takeEffectFromToSolveStack(effectToSolve)

              const request: IEffectFailedInfo = {
                eventNumber: effectToSolve.eventRead.eventNumber,
                effectName: effectToSolve.effectName,
                attempts: effectToSolve.attempts + 1
              }
              EventTools.send({
                command: SystemCommands.effectFailed, request
              }).then(() => {
                callback(null)
              }).catch((sendError: Error | string) => {
                error.op(sendError)
                callback(null)
              })
            }
          })
        }),
        MAX_TASKS_AT_TIME,
        () => {
          state.solving = false
          // console.log('NOW IT IS '+Date.now())
          ast.delay(EFFECT_REST_TIME).then(() => {
            if ( !state.moduleStopped ) { solve() }
            // console.log('AFTER IT IS '+Date.now())
            resolveParallel()
          })
        }
      )
    })

  } else {

    // console.log('NOW IT IS '+Date.now())
    await ast.delay(EFFECT_REST_TIME)
    if ( !state.moduleStopped ) { solve() }
    // console.log('AFTER IT IS '+Date.now())

  }
}

const putEffectInSolveStack = (effectToSolve: IEffectToSolve) => {
  state.effectsToSolve.push(effectToSolve)
}

const takeEffectFromToSolveStack = (effectToTake: IEffectToSolve) => {
  // console.log('effectToSolve before:')
  // console.log(state.effectsToSolve)
  state.effectsToSolve =
    state.effectsToSolve.filter(effectToSolve =>
      effectToSolve.eventRead.eventNumber !=
        effectToTake.eventRead.eventNumber
    )
  // console.log('effectToSolve after:')
  // console.log(state.effectsToSolve)
  // console.log('tooked of '+effectToTake.eventRead.eventNumber+' at '+Date.now())
}

const countEffectToSolveAttempt = (effectToCount: IEffectToSolve) => {
  state.effectsToSolve =
    state.effectsToSolve.map(effectToSolve => {
      if( effectToSolve.eventRead.eventNumber
        === effectToCount.eventRead.eventNumber )
        effectToSolve.attempts++
      return effectToSolve;
    })
}

const dealWithDoubleEffectError = (
  effectToSolve: IEffectToSolve,
  sendError: Error | string
) => {
  const errorDetails = {
    effectName: effectToSolve.effectName,
    eventRead: effectToSolve.eventRead,
    originalError: sendError
  }
  error.op(
    error.is( POSSIBILY_DOUBLE_EFFECT_ERROR + effectToSolve.effectName ),
    errorDetails
  )
}

const dealWithSolvingError = (
  effectToSolve: IEffectToSolve,
  effectError: Error | string
) => {
  const errorDetails = {
    originalError: effectError,
    eventRead: effectToSolve.eventRead
  }
  error.op(
    error.is( EFFECT_SOLVING_ERROR_MESSAGE + effectToSolve.effectName ),
    errorDetails
  )
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
  const oldRegister: any = await db().collection(EFFECT_CONTROLLER_NAME)
    .find({id: EFFECT_CONTROLLER_NAME}).toArray()

  if (oldRegister.length === 0) {
    await db().collection(EFFECT_CONTROLLER_NAME)
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
  start,
  stop,
  isFree,
  getFirstEventNumberToEffect
}
