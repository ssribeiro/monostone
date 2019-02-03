import * as ast from "@angstone/node-util";
import { error } from "./error";

import { ICommand, IFeatureLoaded, IReducer } from "./interfaces";
import { db } from "store";

import { EventEmitter } from "events";
import {
  CatchUpSubscriptionSettings,
  Connection,
  EventStoreStreamCatchUpSubscription,
  ICredentials,
  StoredEvent } from "event-store-client";

export interface EventToReduce {
  commandType: string;
  reducer: IReducer | undefined;
  eventRead: {
    eventNumber: number;
    request: any;
  };
};

export class ReducerController {

  /**
   * list of reducers loaded
   */
  public reducers: any;

  private eventRead$: EventEmitter;
  private eventReduced$: EventEmitter;

  /**
  * Stack of events to reduce
  */
  private eventStack: EventToReduce[] = [];

  public nextEventNumberToReduce: number = 0;
  private reducing: boolean = false;
  private lastTimeReducing: number = Date.now();

  /**
  * Connection with Event Store
  */
  private connection: Connection;
  private credentials: ICredentials;

  /**
  * If already read all past events and now are reducing live events
  */
  public live: boolean = false;
  private stopped: boolean = false;
  private eventStreamSubscription: EventStoreStreamCatchUpSubscription | undefined;

  private EVENT_CONTROLLER_NAME: string = "event_control";
  private REDUCER_REST_TIME: number = 10;
  private MAX_LIVE_QUEUE_SIZE: number = 10000;
  private READ_BATCH_SIZE: number = 500;
  private SECURITY_TIME_DELAY_FOR_EMIT_REDUCED: number = 3;


  constructor(
    connection: Connection,
    credentials: ICredentials,
    eventRead$: EventEmitter,
    eventReduced$: EventEmitter
  ) {
    ast.log("creating reducer controller");

    this.reducers = {};
    this.connection = connection;
    this.credentials = credentials;
    this.eventRead$ = eventRead$;
    this.eventReduced$ = eventReduced$;
  }

  /**
   * starts the reducer reading and reducing all past events
   */
  public async start() {
    await this.registerDbControl();
    ast.log("reading past events from eventsource and reducing then");
    this.readAllPastEvents();
    ast.log("starting reducers");
    this.reduce();
    ast.log("started");
  }

  public async stop() {
    this.stopped = true;
    while ( ! await this.isFree() ) { await ast.delay(this.REDUCER_REST_TIME); }
    await this.unsubscribeStream();
    ast.log("usubscribed from stream");
  }

  public loadReducers(features: IFeatureLoaded[]) {
    features.forEach((feature: IFeatureLoaded) => {
      if (feature.commands) {
        feature.commands.forEach((command: ICommand) => {
          if (command.reducer !== undefined) {
            const commandType = feature.featureName + " " + command.commandName;
            this.reducers[commandType] = {
              reducer: command.reducer,
              subscription: this.eventRead$.addListener(
                commandType,
                ((eventRead: { eventNumber: number, request: any },
              ) => {
                this.eventStack.push({
                  commandType,
                  eventRead,
                  reducer: command.reducer,
                });
              })),
            };
          }
        });
      }
    });
  }

  /**
   * Register the control data on database. This is necessary to coordinate
   * and grant stability and roughness to the system
   */
  public async registerDbControl() {
    ast.log("registering db control");
    const oldRegister: any = await db.collection(this.EVENT_CONTROLLER_NAME)
      .find({id: this.EVENT_CONTROLLER_NAME}).toArray();

    if (oldRegister.length === 0) {
      await db.collection(this.EVENT_CONTROLLER_NAME)
        .insertOne({
           endEvent: 0,
           id: this.EVENT_CONTROLLER_NAME,
           startEvent: 0,
         });
      this.nextEventNumberToReduce = 0;
    } else {
      if ( oldRegister[0].startEvent === oldRegister[0].endEvent ) {
        this.nextEventNumberToReduce = oldRegister[0].endEvent;
      } else {
        error.fatal("unsyncronization in event reduce",
          "you must apply manual correction in db");
      }
    }
  }

  private readAllPastEvents() {
    this.eventStreamSubscription = this.listenToFrom(
      this.nextEventNumberToReduce,
      (event: StoredEvent) => {
        this.eventRead$.emit(event.eventType, {
          eventNumber: event.eventNumber,
          request: event.data,
        });
      },
      (eventStoreStreamCatchUpSubscription: any, reason: string, errorFound: any) => {
        if (reason !== "UserInitiated") {
          error.op("eventstore subscription dropped due to " + reason,
            errorFound,
            eventStoreStreamCatchUpSubscription,
          );
        }
      },
      () => {
        this.live = true;
      },
    );
  }

  /**
   * reduces all non reduced yet events on stack
   */
  public async reduce() {
    while (this.eventStack.length !== 0 && !this.stopped) {
      const reduceRecipe = this.eventStack.shift();
      if ( reduceRecipe && reduceRecipe.reducer ) {
        await this.reduceMarkStart(reduceRecipe.eventRead.eventNumber);
        await reduceRecipe.reducer.process(
          reduceRecipe.eventRead.request,
          reduceRecipe.eventRead.eventNumber,
        ).catch((err: any) => {
          error.fatal(err, "failed reducing command " + reduceRecipe.commandType);
        });
        await this.reduceMarkEnd(reduceRecipe.eventRead.eventNumber);
        setTimeout(() => {
          this.eventReduced$.emit("new", reduceRecipe.eventRead.eventNumber);
        }, this.SECURITY_TIME_DELAY_FOR_EMIT_REDUCED);
      }
    }
    await ast.delay(this.REDUCER_REST_TIME);
    if ( !this.stopped ) { this.reduce(); }
  }

  private async reduceMarkStart(eventNumber: number) {
    this.reducing = true;
    while ( db === undefined ) { await ast.delay(this.REDUCER_REST_TIME); }
    await db.collection(this.EVENT_CONTROLLER_NAME)
      .updateOne({id: this.EVENT_CONTROLLER_NAME}, { $set: { startEvent: eventNumber } });
  }

  private async reduceMarkEnd(eventNumber: number) {
    await db.collection(this.EVENT_CONTROLLER_NAME)
      .updateOne({id: this.EVENT_CONTROLLER_NAME}, { $set: { endEvent: eventNumber } });
    this.lastTimeReducing = Date.now();
    this.reducing = false;
  }

  /**
   * await all past events to be reduced
   */
  public async completePastReducing() {
    while ( !(this.eventStack.length === 0 && this.live) ) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, this.REDUCER_REST_TIME * 5);
      });
    }
  }

  /*
    Executes a catch-up subscription on the given stream,
    reading events from a given event number,
    and continuing with a live subscription when all historical events have been read.
  */
  private listenToFrom(
    fromEventNumber: number,
    onEventAppeared: (event: StoredEvent) => void,
    onDropped: (eventStoreCatchUpSubscription: any, reason: string, error: any) => void,
    onLiveProcessingStarted: () => void,
  ): EventStoreStreamCatchUpSubscription {
    const streamId: string = process.env.EVENT_STREAM_NAME || "mono";
    const settings: CatchUpSubscriptionSettings = {
      debug: false, // process.env.NODE_ENV === "development",
      maxLiveQueueSize: this.MAX_LIVE_QUEUE_SIZE,
      readBatchSize: this.READ_BATCH_SIZE,
      resolveLinkTos: false,
    };
    return this.connection.subscribeToStreamFrom(
      streamId, // streamId - The name of the stream in the Event Store (string)
      fromEventNumber, // fromEventNumber - Which event number to start after
      this.credentials, // credentials - The user name and password needed for permission to subscribe to the stream.
      onEventAppeared, // onEventAppeared - Callback for each event received (historical or live)
      onLiveProcessingStarted, /* onLiveProcessingStarted - Callback when historical events have been read
      and live events are about to be read.*/
      onDropped, // onDropped - Callback when subscription drops or is dropped.
      settings, // settings
    );
  }

  private unsubscribeStream(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.eventStreamSubscription) {
        this.eventStreamSubscription.stop();
        this.eventStreamSubscription = undefined;
        resolve();
      } else {
        resolve();
      }
    });
  }

  public async isFree(): Promise<boolean> {
    if (this.reducing) {
      return false;
    } else {
      if ((Date.now() - this.lastTimeReducing) > 3 * this.REDUCER_REST_TIME) {
        return !this.reducing;
      }
      return false;
    }
  }

}
