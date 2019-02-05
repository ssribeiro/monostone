import * as ast from "@angstone/node-util"
import { error } from "../error"
import { BasicModule, EventModule } from './'

import { EventEmitter } from "events";

import {
  ICommandLoaded,
  IFeatureLoaded,
  IReducer,
  IEventRead
} from "../interfaces"
import { db } from "store"

interface EventToReduce {
  commandType: string
  reducer: IReducer | undefined
  eventRead: IEventRead
};

interface IReducerModuleState {
  firstEventNumberToReduce: number;
  /**
  * list of reducers loaded
  */
  reducers: any;
  /**
  * Stack of events to reduce
  */
  eventStack: EventToReduce[];
  reducing: boolean;
  lastTimeReducing: number;
  moduleStopped: boolean;
  eventReduced$: EventEmitter;
}

const REDUCER_CONTROLLER_NAME: string = "reducer_control"
const REDUCER_REST_TIME: number = 10
const SECURITY_TIME_DELAY_FOR_EMIT_REDUCED: number = 3


const state: IReducerModuleState = {
  firstEventNumberToReduce: 0,
  reducers: {},
  eventStack: [],
  reducing: false,
  lastTimeReducing: Date.now(),
  moduleStopped: false,
  eventReduced$: new EventEmitter().setMaxListeners(Infinity),
}

const config = () => {
  state.firstEventNumberToReduce = 0
  state.reducers = {}
  state.eventStack = []
  state.reducing = false
  state.lastTimeReducing = Date.now()
  state.moduleStopped = false
  state.eventReduced$ = new EventEmitter().setMaxListeners(Infinity)
}

const loadFeatures = async (features: IFeatureLoaded[]) => {
  features.forEach((feature: IFeatureLoaded) => {
    if (feature.commands) {
      feature.commands.forEach((command: ICommandLoaded) => {
        if (command.reducer !== undefined) {
          state.reducers[command.commandType] = {
            reducer: command.reducer,
            subscription: EventModule.state.eventRead$.addListener(
              command.commandType,
              ((eventRead: IEventRead,
            ) => {
              state.eventStack.push({
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
  return state.firstEventNumberToReduce
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
    state.firstEventNumberToReduce = 0
  } else {
    if ( oldRegister[0].startEvent === oldRegister[0].endEvent ) {
      state.firstEventNumberToReduce = oldRegister[0].endEvent
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
  reduce()
  await completePastReducing()
  ast.log("reducer controller started")
}

/**
 * reduces all non reduced yet events on stack
 */
const reduce = async () => {
  while (state.eventStack.length !== 0 && !state.moduleStopped) {
    const reduceRecipe = state.eventStack.shift()
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
        state.eventReduced$.emit(
          reduceRecipe.commandType,
          reduceRecipe.eventRead
        )
      }, SECURITY_TIME_DELAY_FOR_EMIT_REDUCED)
    }
  }
  await ast.delay(REDUCER_REST_TIME)
  if ( !state.moduleStopped ) { reduce() }
}

const reduceMarkStart = async (eventNumber: number) => {
  state.reducing = true
  while ( db === undefined ) { await ast.delay(REDUCER_REST_TIME) }
  await db.collection(REDUCER_CONTROLLER_NAME)
    .updateOne({id: REDUCER_CONTROLLER_NAME},
      { $set: { startEvent: eventNumber } })
}

const reduceMarkEnd = async (eventNumber: number) => {
  await db.collection(REDUCER_CONTROLLER_NAME)
    .updateOne({id: REDUCER_CONTROLLER_NAME},
      { $set: { endEvent: eventNumber } })
  state.lastTimeReducing = Date.now()
  state.reducing = false
}

/**
 * await all past events to be reduced
 */
const completePastReducing = async () => {
  while ( !(state.eventStack.length === 0 && EventModule.state.isStreamInLive) ) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, REDUCER_REST_TIME * 5)
    })
  }
}

const stop = async () => {
  state.moduleStopped = true
  while ( ! await isFree() ) { await ast.delay(REDUCER_REST_TIME) }
}

const isFree = async (): Promise<boolean> => {
  if (state.reducing) return false
  else {
    if ((Date.now() - state.lastTimeReducing) > 3 * REDUCER_REST_TIME)
      return !state.reducing
    return false
  }
}

// const getEventReducedStream = (): EventEmitter => state.eventReduced$

export const ReducerModule = {
  ...BasicModule,
  config,
  loadFeatures,
  start,
  stop,
  isFree,
  getFirstEventNumberToReduce,
  state
}
