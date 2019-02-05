import * as ast from "@angstone/node-util"
import { error } from "../error"
import { BasicModule, EventModule } from './'

import * as events from "events";

import {
  ICommandLoaded,
  IFeatureLoaded,
  IReducer,
  IEventRead
} from "../interfaces"
import { db } from "store"

export interface EventToReduce {
  commandType: string
  reducer: IReducer | undefined
  eventRead: IEventRead
};

const REDUCER_CONTROLLER_NAME: string = "reducer_control"
const REDUCER_REST_TIME: number = 10
const SECURITY_TIME_DELAY_FOR_EMIT_REDUCED: number = 3

let firstEventNumberToReduce: number = 0

/**
* list of reducers loaded
*/
let reducers: any = {}

/**
* Stack of events to reduce
*/
const eventStack: EventToReduce[] = []
let reducing: boolean = false
let lastTimeReducing: number = Date.now()
let moduleStopped: boolean = false

const eventReduced$: events.EventEmitter = new events.EventEmitter()
  .setMaxListeners(Infinity)

const loadFeatures = async (features: IFeatureLoaded[]) => {
  features.forEach((feature: IFeatureLoaded) => {
    if (feature.commands) {
      feature.commands.forEach((command: ICommandLoaded) => {
        if (command.reducer !== undefined) {
          reducers[command.commandType] = {
            reducer: command.reducer,
            subscription: EventModule.eventRead$.addListener(
              command.commandType,
              ((eventRead: IEventRead,
            ) => {
              eventStack.push({
                commandType: command.commandType,
                eventRead,
                reducer: command.reducer,
              })
            })),
          }
        }
      })
    }
  })
}

const getFirstEventNumberToReduce = async (): Promise<number> => {
  await registerDbControl()
  return firstEventNumberToReduce
}

/**
 * Register the control data on database. This is necessary to coordinate
 * and grant stability and roughness to the system
 */
const registerDbControl = async () => {
  ast.log("registering db control")
  const oldRegister: any = await db.collection(REDUCER_CONTROLLER_NAME)
    .find({id: REDUCER_CONTROLLER_NAME}).toArray()

  if (oldRegister.length === 0) {
    await db.collection(REDUCER_CONTROLLER_NAME)
      .insertOne({
         endEvent: 0,
         id: REDUCER_CONTROLLER_NAME,
         startEvent: 0,
       })
    firstEventNumberToReduce = 0
  } else {
    if ( oldRegister[0].startEvent === oldRegister[0].endEvent ) {
      firstEventNumberToReduce = oldRegister[0].endEvent
    } else {
      error.fatal("unsyncronization in event reduce",
        "you must apply manual correction in db")
    }
  }
}

/**
 * starts the reducer reading and reducing all past events
 */
const start = async () => {
  await reduce()
  await completePastReducing()
  ast.log("reducer controller started")
}

/**
 * reduces all non reduced yet events on stack
 */
const reduce = async () => {
  while (eventStack.length !== 0 && !moduleStopped) {
    const reduceRecipe = eventStack.shift()
    if ( reduceRecipe && reduceRecipe.reducer ) {
      await reduceMarkStart(reduceRecipe.eventRead.eventNumber)
      await reduceRecipe.reducer.process(
        reduceRecipe.eventRead.request,
        reduceRecipe.eventRead.eventNumber,
      ).catch((err: any) => {
        error.fatal(err, "failed reducing command " + reduceRecipe.commandType)
      })
      await reduceMarkEnd(reduceRecipe.eventRead.eventNumber)
      setTimeout(() => {
        eventReduced$.emit(
          reduceRecipe.commandType,
          reduceRecipe.eventRead
        )
      }, SECURITY_TIME_DELAY_FOR_EMIT_REDUCED)
    }
  }
  await ast.delay(REDUCER_REST_TIME)
  if ( !moduleStopped ) { reduce() }
}

const reduceMarkStart = async (eventNumber: number) => {
  reducing = true
  while ( db === undefined ) { await ast.delay(REDUCER_REST_TIME) }
  await db.collection(REDUCER_CONTROLLER_NAME)
    .updateOne({id: REDUCER_CONTROLLER_NAME},
      { $set: { startEvent: eventNumber } })
}

const reduceMarkEnd = async (eventNumber: number) => {
  await db.collection(REDUCER_CONTROLLER_NAME)
    .updateOne({id: REDUCER_CONTROLLER_NAME},
      { $set: { endEvent: eventNumber } })
  lastTimeReducing = Date.now()
  reducing = false
}

/**
 * await all past events to be reduced
 */
const completePastReducing = async () => {
  while ( !(eventStack.length === 0 && EventModule.isStreamInLive) ) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, REDUCER_REST_TIME * 5)
    })
  }
}

const stop = async () => {
  moduleStopped = true
  while ( ! await isFree() ) { await ast.delay(REDUCER_REST_TIME) }
}

const isFree = async (): Promise<boolean> => {
  if (reducing) return false
  else {
    if ((Date.now() - lastTimeReducing) > 3 * REDUCER_REST_TIME)
      return !reducing
    return false
  }
}

export const ReducerModule = {
  ...BasicModule,
  loadFeatures,
  start,
  stop,
  eventReduced$,
  isFree,
  getFirstEventNumberToReduce
}
