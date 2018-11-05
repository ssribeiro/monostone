import * as ast from "@angstone/node-util";
import {
  CatchUpSubscriptionSettings,
  Connection,
  EventStoreStreamCatchUpSubscription,
  ICredentials,
  StoredEvent } from "event-store-client";
import { EventEmitter } from "events";
import { error } from "./error";
import { ICommand, IFeature, IReducer } from "./interfaces";
import { db } from "./store";

export class EventController {

  public eventRead$: EventEmitter;
  public eventReduced$: EventEmitter;
  public reducers: any;
  public connection: Connection;
  public live: boolean = false;
  public eventStreamSubscription: EventStoreStreamCatchUpSubscription | undefined;
  public eventStack: Array<{
    commandType: string;
    reducer: IReducer | undefined;
    eventRead: {
      eventNumber: number;
      request: any;
    };
  }> = [];
  public closed: boolean = false;
  public nextEventNumberToReduce: number = 0;
  private credentials: ICredentials;
  private REDUCER_REST_TIME: number = 10;
  private eventControllerName: string = "event_control";
  private reducing: boolean = false;
  private lastTimeReducing: number = Date.now();
  private restTimeToBeConsideredNotReducing = 100;
  private stoped: boolean = false;

  constructor() {
    ast.log("creating event controller");
    this.eventRead$ = new EventEmitter();
    this.eventReduced$ = new EventEmitter();
    this.reducers = {};
    this.credentials = {
      password: process.env.EVENT_SOURCE_PASSWORD || "changeit",
      username: process.env.EVENT_SOURCE_USERNAME || "admin",
    };
    ast.log("creating connection to event store");
    this.connection = this.createConnection();
    ast.log("event store connected");
  }

  public async stop() {
    ast.log("stoping event controller");
    this.stoped = true;
    while ( ! await this.isFree() ) { await ast.delay(10); }
    await this.unsubscribeStream();
    ast.log("usubscribed from stream");
    await this.closeConnection();
    ast.log("connection closed");
  }

  public async start() {
    ast.log("starting event controller");
    await this.registerDbControl();
    ast.log("starting reducer");
    await this.startReducer();
    ast.log("event controller ready");
  }

  public async startReducer() {
    ast.log("reading past events from eventsource and reducing then");
    this.readAllPastEvents();
    ast.log("starting reducers");
    this.reduce();
    ast.log("started");
  }

  public async reduce() {
    while (this.eventStack.length !== 0 && !this.stoped) {
      const reduceRecipe = this.eventStack.shift();
      if ( reduceRecipe && reduceRecipe.reducer ) {
        await this.reduceMarkStart(reduceRecipe.eventRead.eventNumber);
        await reduceRecipe.reducer.process(
          reduceRecipe.eventRead.request,
          reduceRecipe.eventRead.eventNumber,
        ).catch((err: any) => {
          error.fatal("failed reducing command " + reduceRecipe.commandType, err);
        });
        await this.reduceMarkEnd(reduceRecipe.eventRead.eventNumber);
        this.eventReduced$.emit("new", reduceRecipe.eventRead.eventNumber);
      }
    }
    await ast.delay(this.REDUCER_REST_TIME);
    if ( !this.stoped ) { this.reduce(); }
  }

  public async completePastReducing() {
    while ( !(this.eventStack.length === 0 && this.live) ) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, this.REDUCER_REST_TIME * 5);
      });
    }
  }

  public loadReducers(features: IFeature[]) {
    features.forEach((feature: IFeature) => {
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

  public async registerDbControl() {
    ast.log("registering db control");
    const oldRegister: any = await db.collection(this.eventControllerName)
      .find({id: this.eventControllerName}).toArray();

    if (oldRegister.length === 0) {
      await db.collection(this.eventControllerName)
        .insertOne({
           endEvent: 0,
           id: this.eventControllerName,
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

  public async isFree(): Promise<boolean> {
    if (this.reducing) {
      return false;
    } else {
      if ((Date.now() - this.lastTimeReducing) > this.restTimeToBeConsideredNotReducing) {
        return !this.reducing;
      }
      return false;
    }
  }

  private async reduceMarkStart(eventNumber: number) {
    this.reducing = true;
    while ( db === undefined ) { await ast.delay(10); }
    await db.collection(this.eventControllerName)
      .updateOne({id: this.eventControllerName}, { $set: { startEvent: eventNumber } });
  }

  private async reduceMarkEnd(eventNumber: number) {
    await db.collection(this.eventControllerName)
      .updateOne({id: this.eventControllerName}, { $set: { endEvent: eventNumber } });
    this.lastTimeReducing = Date.now();
    this.reducing = false;
  }

  private createConnection(): Connection {
    const options = {
      debug: false, // process.env.NODE_ENV === "development",
      host: process.env.EVENT_SOURCE_HOST,
      onClose: () => {
        if (!this.closed) {
          error.fatal("connection to eventstore was closed");
        }
      },
      onError: (err: any) => {
        if (!this.closed) { error.fatal("EventController could not connect to eventstore", err); }
      },
      port: process.env.EVENT_SOURCE_PORT,
    };
    return new Connection(options);
  }

  private closeConnection(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.closed) {
        this.closed = true;
        if (this.connection) {
          this.connection.close();
          resolve();
        } else {
          resolve();
        }
      } else {
        resolve();
      }
    });
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
          error.is("eventstore subscription dropped due to " + reason,
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
      maxLiveQueueSize: 10000,
      readBatchSize: 500,
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

}
