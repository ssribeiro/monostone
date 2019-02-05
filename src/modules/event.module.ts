/**
* Controlls the events toolchain
*/

import * as ast from "@angstone/node-util"
import { error } from "../error"

import { BasicModule, ReducerModule } from './'
import { IEventRead } from '../interfaces'

import { EventEmitter } from "events";
import {
  CatchUpSubscriptionSettings,
  Connection,
  EventStoreStreamCatchUpSubscription,
  ICredentials,
  StoredEvent
} from "event-store-client"

interface IEventModuleState {
  isStreamInLive: boolean;
  connection: Connection | undefined;
  credentials: ICredentials | undefined;
  eventStreamSubscription: EventStoreStreamCatchUpSubscription | undefined;
  firstEventNumberToReduce: number;
  moduleClosed: boolean;
  eventRead$: EventEmitter;
}

const MAX_LIVE_QUEUE_SIZE: number = 10000
const READ_BATCH_SIZE: number = 500

const state: IEventModuleState = {
  isStreamInLive: false,
  connection: undefined,
  credentials: undefined,
  eventStreamSubscription: undefined,
  firstEventNumberToReduce: 0,
  moduleClosed: false,
  eventRead$: new EventEmitter().setMaxListeners(Infinity),
}

const config = () => {
  ast.log("creating event controller")
  state.isStreamInLive = false
  state.eventStreamSubscription = undefined
  state.firstEventNumberToReduce = 0
  state.moduleClosed = false
  state.eventRead$ = new EventEmitter().setMaxListeners(Infinity)
  state.credentials = {
    password: process.env.EVENT_SOURCE_PASSWORD || "changeit",
    username: process.env.EVENT_SOURCE_USERNAME || "admin",
  }
  ast.log("creating connection to event store")
  state.connection = createConnection()
  ast.log("event store connected")
}

/**
 * Creates connection with Event Store
 */
const createConnection = (): Connection => {
  const options = {
    debug: false, // process.env.NODE_ENV === "development",
    host: process.env.EVENT_SOURCE_HOST,
    onClose: () => {
      if (!state.moduleClosed) error.fatal("connection to eventstore was closed");
    },
    onError: (err: any) => {
      if (!state.moduleClosed) error.fatal(err,
        "EventController could not connect to eventstore");
    },
    port: process.env.EVENT_SOURCE_PORT,
  }
  return new Connection(options)
}

const stop = async() => {
  ast.log("stoping event controller")
  await unsubscribeStream()
  ast.log("usubscribed from stream")
  await closeConnection()
  ast.log("connection closed")
}

const unsubscribeStream = (): Promise<void> => {
  return new Promise<void>((resolve) => {
    if (state.eventStreamSubscription) {
      state.eventStreamSubscription.stop()
      state.eventStreamSubscription = undefined
      resolve()
    } else {
      resolve()
    }
  });
}

const closeConnection = (): Promise<void> => {
  return new Promise<void>((resolve) => {
    if (!state.moduleClosed) {
      state.moduleClosed = true
      if (state.connection) {
        state.connection.close()
        state.connection = undefined
        resolve()
      } else {
        resolve()
      }
    } else {
      resolve()
    }
  })
}

const start = async () => {
  ast.log("starting event controller")
  await calculateFirstEventNumberToReduce()
  ast.log("reading past events from eventsource")
  readAllPastEvents()
  ast.log("event controller ready")
}

const calculateFirstEventNumberToReduce = async () => {
  state.firstEventNumberToReduce = Math.min(...[
    await ReducerModule.getFirstEventNumberToReduce()
  ]);
}

const readAllPastEvents = () => {
  state.eventStreamSubscription = listenToFrom(
    state.firstEventNumberToReduce,
    (event: StoredEvent) => {
      const eventRead: IEventRead = {
        eventNumber: event.eventNumber,
        request: event.data,
      }
      // console.log("this is an emit of: ", eventRead);
      state.eventRead$.emit(event.eventType, eventRead)
    },
    (eventStoreStreamCatchUpSubscription: any, reason: string, errorFound: any) => {
      if (reason !== "UserInitiated") {
        error.op("eventstore subscription dropped due to " + reason,
          errorFound,
          eventStoreStreamCatchUpSubscription,
        )
      }
    },
    () => {
      state.isStreamInLive = true
    },
  )
}

/*
  Executes a catch-up subscription on the given stream,
  reading events from a given event number,
  and continuing with a live subscription when all historical events have been read.
*/
const listenToFrom = (
  fromEventNumber: number,
  onEventAppeared: (event: StoredEvent) => void,
  onDropped: (eventStoreCatchUpSubscription: any, reason: string, error: any) => void,
  onLiveProcessingStarted: () => void,
): EventStoreStreamCatchUpSubscription | undefined => {
  const streamId: string = process.env.EVENT_STREAM_NAME || "mono"
  const settings: CatchUpSubscriptionSettings = {
    debug: false, // process.env.NODE_ENV === "development",
    maxLiveQueueSize: MAX_LIVE_QUEUE_SIZE,
    readBatchSize: READ_BATCH_SIZE,
    resolveLinkTos: false,
  }
  if( state.connection && state.credentials ) {
    return state.connection.subscribeToStreamFrom(
      streamId, // streamId - The name of the stream in the Event Store (string)
      fromEventNumber, // fromEventNumber - Which event number to start after
      state.credentials, // credentials - The user name and password needed for permission to subscribe to the stream.
      onEventAppeared, // onEventAppeared - Callback for each event received (historical or live)
      onLiveProcessingStarted, /* onLiveProcessingStarted - Callback when historical events have been read
      and live events are about to be read.*/
      onDropped, // onDropped - Callback when subscription drops or is dropped.
      settings, // settings
    )
  }
}

// const isStreamInLive = (): boolean => state.isStreamInLive
// const getEventReadStream = (): EventEmitter => state.eventRead$

export const EventModule = {
  ...BasicModule,
  config,
  start,
  stop,
  state
}
