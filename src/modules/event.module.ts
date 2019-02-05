/**
* Controlls the events toolchain
*/

import * as ast from "@angstone/node-util"
import { error } from "../error"

import { BasicModule, ReducerModule } from './'
import { IEventRead } from '../interfaces'

import * as events from "events";
import {
  CatchUpSubscriptionSettings,
  Connection,
  EventStoreStreamCatchUpSubscription,
  ICredentials,
  StoredEvent
} from "event-store-client"

ast.log("creating event controller")

const MAX_LIVE_QUEUE_SIZE: number = 10000
const READ_BATCH_SIZE: number = 500

const eventRead$: events.EventEmitter = new events.EventEmitter()
  .setMaxListeners(Infinity)

let connection: Connection | undefined
let credentials: ICredentials
let eventStreamSubscription: EventStoreStreamCatchUpSubscription | undefined
let isStreamInLive: boolean = false
let moduleClosed: boolean = false

let firstEventNumberToReduce: number = 0

const config = () => {
  credentials = {
    password: process.env.EVENT_SOURCE_PASSWORD || "changeit",
    username: process.env.EVENT_SOURCE_USERNAME || "admin",
  }
  ast.log("creating connection to event store")
  connection = createConnection()
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
      if (!moduleClosed) error.fatal("connection to eventstore was closed");
    },
    onError: (err: any) => {
      if (!moduleClosed) error.fatal(err,
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
    if (eventStreamSubscription) {
      eventStreamSubscription.stop()
      eventStreamSubscription = undefined
      resolve()
    } else {
      resolve()
    }
  });
}

const closeConnection = (): Promise<void> => {
  return new Promise<void>((resolve) => {
    if (!moduleClosed) {
      moduleClosed = true
      if (connection) {
        connection.close()
        connection = undefined
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
  firstEventNumberToReduce = Math.min(...[
    await ReducerModule.getFirstEventNumberToReduce()
  ]);
}

const readAllPastEvents = () => {
  eventStreamSubscription = listenToFrom(
  firstEventNumberToReduce,
  (event: StoredEvent) => {
    const eventRead: IEventRead = {
      eventNumber: event.eventNumber,
      request: event.data,
    }
    // console.log("this is an emit of: ", eventRead);
    eventRead$.emit(event.eventType, eventRead)
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
      isStreamInLive = true;
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
  if( connection ) {
    return connection.subscribeToStreamFrom(
      streamId, // streamId - The name of the stream in the Event Store (string)
      fromEventNumber, // fromEventNumber - Which event number to start after
      credentials, // credentials - The user name and password needed for permission to subscribe to the stream.
      onEventAppeared, // onEventAppeared - Callback for each event received (historical or live)
      onLiveProcessingStarted, /* onLiveProcessingStarted - Callback when historical events have been read
      and live events are about to be read.*/
      onDropped, // onDropped - Callback when subscription drops or is dropped.
      settings, // settings
    )
  }
}

export const EventModule = {
  ...BasicModule,
  config,
  start,
  stop,
  eventRead$,
  isStreamInLive,
}
