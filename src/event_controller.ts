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
import { Store } from "./store";

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
  public nextEventNumberToReduce: number = -1;
  private credentials: ICredentials;
  private REDUCER_REST_TIME: number = 10;
  private eventControllerSchema = {
    modelName: "eventcontrol",
    schema: {
      properties: {
        endEvent: { type: "number" },
        id: { type: "string" },
        startEvent: { type: "number" },
      },
      type: "object",
    },
  };

  constructor() {
    ast.log("starting event controller");
    this.eventRead$ = new EventEmitter();
    this.eventReduced$ = new EventEmitter();
    this.reducers = {};
    ast.log("loading reducers");
    this.credentials = {
      password: process.env.EVENT_SOURCE_PASSWORD || "changeit",
      username: process.env.EVENT_SOURCE_USERNAME || "admin",
    };
    this.connection = this.createConnection();
    ast.log("reading past events from eventsource and reducing then");
  }

  public async stop() {
    await this.unsubscribeStream();
    await this.closeConnection();
  }

  public async start() {
    // await SystemTools.use();
    await this.registerDbControl();
    await this.startReducer();
  }

  public async startReducer() {
    this.readAllPastEvents();
    this.reduce();
  }

  public async reduce() {
    while (this.eventStack.length !== 0) {
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
    await new Promise<void>((resolve) => {
      setTimeout(resolve, this.REDUCER_REST_TIME);
    });
    this.startReducer();
  }

  public async completePastReducing() {
    while (this.eventStack.length !== 0 && !this.live) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, this.REDUCER_REST_TIME * 5);
      });
    }
    ast.log("past reducing completed, now open for live events");
  }

  public loadReducers(features: IFeature[]) {
    features.forEach((feature: IFeature) => {
      if (feature.commands) {
        feature.commands.forEach((command: ICommand) => {
          if (command.reducer !== undefined) {
            const commandType = feature.featureName + " " + command.commandName;
            this.reducers[commandType] = {
              reducer: command.reducer,
              subscription: this.eventRead$.addListener(commandType, ((eventRead) => {
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
    Store.defineMapper(this.eventControllerSchema.modelName, {
      schema: this.eventControllerSchema.schema,
    });

    await ast.delay(10);

    let oldRegister = await Store.as(this.eventControllerSchema.modelName)
      .find(this.eventControllerSchema.modelName).catch((err: any) => {
        console.log(err.msg);
        if ( err.msg ) {
          if ( !(err.msg.indexOf("does not exist") > 0) && ( !(err.msg.indexOf("Table") > 0)
          || !(err.msg.indexOf("Database") > 0)) ) {
            throw err;
          } else {
            return undefined;
          }
        } else {
          throw err;
        }
      });

    console.log(oldRegister);

    if (!oldRegister) {
      await Store.as(this.eventControllerSchema.modelName)
        .create({
          endEvent: -1,
          id: this.eventControllerSchema.modelName,
          startEvent: -1,
        }).catch((err) => {
          console.log(err.msg);
        });

      oldRegister = await Store.getMapper(this.eventControllerSchema.modelName)
        .find(this.eventControllerSchema.modelName);

      console.log(oldRegister);
      this.nextEventNumberToReduce = 0;
    } else {
      if ( oldRegister.startEvent === oldRegister.endEvent ) {
       this.nextEventNumberToReduce = oldRegister.endEvent;
      } else {
       error.fatal("unsyncronization in event reduce",
         "you must apply manual correction in db");
      }
    }

    // const control = await Store.as(this.eventControllerSchema.modelName)
    //   .find(this.eventControllerSchema.modelName)
    //   .catch((err: any) => {
    //     if ( err.msg.indexOf("Table") >= 0 && err.msg.indexOf("does not exist") >= 0 ) {
    //       return undefined;
    //     } else {
    //       throw err;
    //     }
    //   });

    // if ( !control ) {
    //   while (!this.controlRegisterCreated) {
    //     await this.createControlRegister();
    //   }
    //   this.nextEventNumberToReduce = 0;
    // } else {
    //   if ( control.startEvent === control.endEvent ) {
    //     this.nextEventNumberToReduce = control.endEvent;
    //   } else {
    //     error.fatal("unsyncronization in event reduce",
    //       "you must apply manual correction in db");
    //   }
    // }
  }

  private async reduceMarkStart(eventNumber: number) {
    await Store.as(this.eventControllerSchema.modelName).update(
      this.eventControllerSchema.modelName, {
        startEvent: eventNumber,
      },
    );
  }

  private async reduceMarkEnd(eventNumber: number) {
    await Store.as(this.eventControllerSchema.modelName).update(
      this.eventControllerSchema.modelName, {
        endEvent: eventNumber,
      },
    );
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
      this.closed = true;
      if (this.connection) {
        this.connection.close();
        resolve();
      } else {
        resolve();
      }
    });
  }

  private readAllPastEvents() {
    this.eventStreamSubscription = this.listenToFrom(
      this.nextEventNumberToReduce,
      (event: StoredEvent) => {
        // console.log(event.eventType);
        // console.log(event.eventNumber);
        // console.log(event.data);
        this.eventRead$.emit(event.eventType, {
          eventNumber: event.eventNumber,
          request: event.data,
        });
      },
      (eventStoreStreamCatchUpSubscription: any, reason: string, errorFound: any) => {
        error.is("eventstore subscription dropped due to " + reason,
          errorFound,
          eventStoreStreamCatchUpSubscription,
        );
        /*
        EventTools.send({ command: SystemCommands.streamAssure }).then(() => {
          setTimeout(() => {
            this.readAllPastEvents();
          }, this.CONNECTION_DROP_REST_TIME);
        });
        */
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
