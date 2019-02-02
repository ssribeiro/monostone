import * as ast from "@angstone/node-util";
import {
  CatchUpSubscriptionSettings,
  Connection,
  EventStoreStreamCatchUpSubscription,
  ICredentials,
  StoredEvent } from "event-store-client";
import { EventEmitter } from "events";
import { error } from "./error";
import { ICommand, IFeatureLoaded, IReducer, IViewLoaded } from "./interfaces";
import { db } from "store";

/**
 * Controlls the events toolchain
 */
export class EventController {

  /**
   * Stream of events read from event store
   */
  public eventRead$: EventEmitter;
  /**
   * Stream of events already reduced
   */
  public eventReduced$: EventEmitter;

  /**
   * list of reducers loaded
   */
  public reducers: any;

  /**
   * Object to store all data from views that are required to
   * be persisted across iterations within the reducer
   */
  public viewsData: any = {};

  private initialRenders: Array<{
    viewTag: string,
    method: () => Promise<any>,
  }> = [];
  private watchers: Array<{
    event: string,
    views: Array<{
      viewTag: string,
      method: (lastData?: any, event?: any) => Promise<any>,
    }>,
  }> = [];

  /**
   * Connection with Event Store
   */
  private connection: Connection;

  /**
   * If already read all past events and now are reducing live events
   */
  public live: boolean = false;
  private eventStreamSubscription: EventStoreStreamCatchUpSubscription | undefined;

  /**
   * Stack of events to reduce
   */
  private eventStack: Array<{
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
  private RENDER_REST_TIME: number = 10;
  private MAX_LIVE_QUEUE_SIZE: number = 10000;
  private READ_BATCH_SIZE: number = 500;
  private SECURITY_TIME_DELAY_FOR_EMIT_REDUCED: number = 3;
  private eventControllerName: string = "event_control";

  private reducing: boolean = false;
  private lastTimeReducing: number = Date.now();

  private rendering: boolean = false;
  private lastTimeRendering: number = Date.now();

  private stoped: boolean = false;

  constructor() {
    ast.log("creating event controller");

    this.eventRead$ = new EventEmitter();
    this.eventRead$.setMaxListeners(Infinity);
    this.eventReduced$ = new EventEmitter();
    this.eventReduced$.setMaxListeners(Infinity);

    this.reducers = {};
    this.credentials = {
      password: process.env.EVENT_SOURCE_PASSWORD || "changeit",
      username: process.env.EVENT_SOURCE_USERNAME || "admin",
    };
    ast.log("creating connection to event store");
    this.connection = this.createConnection();
    ast.log("event store connected");
  }

  /**
   * stops the event controller after free all tasks
   */
  public async stop() {
    ast.log("stoping event controller");
    this.stoped = true;
    while ( ! await this.isFree() ) { await ast.delay(this.REDUCER_REST_TIME); }
    await this.unsubscribeStream();
    ast.log("usubscribed from stream");
    await this.closeConnection();
    ast.log("connection closed");
  }

  /**
   * starts event controller
   */
  public async start() {
    ast.log("starting event controller");
    await this.registerDbControl();
    ast.log("starting reducer");
    await this.startReducer();
    ast.log("event controller ready");
  }

  /**
   * starts the reducer reading and reducing all past events
   */
  public async startReducer() {
    ast.log("reading past events from eventsource and reducing then");
    this.readAllPastEvents();
    ast.log("starting reducers");
    this.reduce();
    ast.log("started");
  }

  /**
   * reduces all non reduced yet events on stack
   */
  public async reduce() {
    while (this.eventStack.length !== 0 && !this.stoped) {
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
    if ( !this.stoped ) { this.reduce(); }
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

  public loadFeatures(features: IFeatureLoaded[]) {
    this.loadReducers(features);
    this.loadViews(features);
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

  public loadViews(features: IFeatureLoaded[]) {
    features.forEach((feature: IFeatureLoaded) => {
      if (feature.views) {
        feature.views.forEach((view: IViewLoaded) => {

          this.viewsData[view.featureName + " " + view.viewName] = {};

          if (view.renderUpdate && view.watchEvents) {
            view.watchEvents.forEach((watchEvent: string) => {
              const alreadyInitiatedWatcher = this.watchers.filter((watch) => {
                return watch.event === watchEvent;
              });
              if ( alreadyInitiatedWatcher.length === 0 ) {
                this.watchers.push({
                  event: watchEvent,
                  views: [],
                });
              }
              this.watchers = this.watchers.map((watch) => {
                if (watch.event === watchEvent) {
                  watch.views.push({
                    method: view.renderUpdate as (lastData?: any, event?: any) => Promise<any>,
                    viewTag: view.featureName + " " + view.viewName,
                  });
                }
                return watch;
              });
            });
          }

          if (view.renderInitial) {
            this.initialRenders.push({
              method: view.renderInitial,
              viewTag: view.featureName + " " + view.viewName,
            });
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

  /**
   * check if it does not have ongoing tasks
   * @return boolean
   */
  public async isFree(): Promise<boolean> {
    return await this.isReducerFree() && await this.isRenderFree();
  }

  public async isReducerFree(): Promise<boolean> {
    if (this.reducing) {
      return false;
    } else {
      if ((Date.now() - this.lastTimeReducing) > 3 * this.REDUCER_REST_TIME) {
        return !this.reducing;
      }
      return false;
    }
  }

  public async isRenderFree(): Promise<boolean> {
    if (this.rendering) {
      return false;
    } else {
      if ((Date.now() - this.lastTimeRendering) > 3 * this.RENDER_REST_TIME) {
        return !this.rendering;
      }
      return false;
    }
  }

  /**
   * renders views
   */
  public async renderViews() {
    this.rendering = true;
    for (const initialRenderIndex in this.initialRenders) {
      if (this.initialRenders[initialRenderIndex]) {
        this.viewsData[ this.initialRenders[initialRenderIndex].viewTag ] =
          await this.initialRenders[initialRenderIndex].method();
      }
    }
    this.rendering = false;
    this.lastTimeRendering = Date.now();

    this.watchEvents();

    await ast.delay(2);
  }

  /**
   * watch for events
   */
  public watchEvents() {
    this.watchers.forEach((watcher: {
      event: string,
      views: Array<{
        viewTag: string,
        method: (lastData?: any, event?: any) => Promise<any>,
      }>,
    }) => {
      this.eventRead$.addListener(watcher.event, (event: {
        eventNumber: number,
        request: any,
      }) => {
        this.rendering = true;
        watcher.views.forEach((view: {
          viewTag: string,
          method: (lastData?: any, event?: any) => Promise<any>,
        }) => {
          view.method(this.viewsData[view.viewTag], event).then((newData: any) => {
            this.viewsData[view.viewTag] = newData;
          });
        });
        this.lastTimeRendering = Date.now();
        this.rendering = false;
      });
    });
  }

  private async reduceMarkStart(eventNumber: number) {
    this.reducing = true;
    while ( db === undefined ) { await ast.delay(this.REDUCER_REST_TIME); }
    await db.collection(this.eventControllerName)
      .updateOne({id: this.eventControllerName}, { $set: { startEvent: eventNumber } });
  }

  private async reduceMarkEnd(eventNumber: number) {
    await db.collection(this.eventControllerName)
      .updateOne({id: this.eventControllerName}, { $set: { endEvent: eventNumber } });
    this.lastTimeReducing = Date.now();
    this.reducing = false;
  }

  /**
   * Creates connection with Event Store
   */
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
        if (!this.closed) { error.fatal(err, "EventController could not connect to eventstore"); }
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

}
