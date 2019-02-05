import * as ast from "@angstone/node-util";
import { error } from "./error";

import { Controller } from './controller';
import { ReducerController } from './reducer_controller';

import { IEventRead } from './interfaces';

import {
  CatchUpSubscriptionSettings,
  Connection,
  EventStoreStreamCatchUpSubscription,
  ICredentials,
  StoredEvent
} from "event-store-client";
import * as events from "events";

// TODO: Create effect controller separated files
// TODO: Test if reducerController and viewController was sharing watchers

/**
 * Controlls the events toolchain
 */
export class EventController extends Controller {

  /*
  private effectWatchers: Array<{
   /
    eventTrigger: string,
    effects: Array<{
      effectName: string,
      effectMethodRun: (eventNumber?: number | undefined, request?: any) => Promise<void>,
    }>,
  }> = [];
  */

  private static MAX_LIVE_QUEUE_SIZE: number = 10000;
  private static READ_BATCH_SIZE: number = 500;

  /**
   * Stream of events read from event store
   */
  public static eventRead$: events.EventEmitter = new events.EventEmitter().setMaxListeners(Infinity);
  /**
   * Stream of events already reduced
   */
  public static eventReduced$: events.EventEmitter = new events.EventEmitter().setMaxListeners(Infinity);
  /**
  * If already read all past events and now are reducing live events
  */
  public static isStreamInLive: boolean = false;

  /**
   * Connection with Event Store
   */
  private connection: Connection | undefined;

  private eventStreamSubscription: EventStoreStreamCatchUpSubscription | undefined;

  public closed: boolean = false;
  private credentials: ICredentials;

  public firstEventNumberToReduce: number = 0;

  constructor() {
    super();
    ast.log("creating event controller");

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
    await this.calculateFirstEventNumberToReduce();
    ast.log("reading past events from eventsource");
    this.readAllPastEvents();
    ast.log("event controller ready");
  }

  private readAllPastEvents() {
    this.eventStreamSubscription = this.listenToFrom(
      this.firstEventNumberToReduce,
      (event: StoredEvent) => {
        const eventRead: IEventRead = {
          eventNumber: event.eventNumber,
          request: event.data,
        };
        // console.log("this is an emit of: ", eventRead);
        EventController.eventRead$.emit(event.eventType, eventRead);
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
        EventController.isStreamInLive = true;
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
  ): EventStoreStreamCatchUpSubscription | undefined {
    const streamId: string = process.env.EVENT_STREAM_NAME || "mono";
    const settings: CatchUpSubscriptionSettings = {
      debug: false, // process.env.NODE_ENV === "development",
      maxLiveQueueSize: EventController.MAX_LIVE_QUEUE_SIZE,
      readBatchSize: EventController.READ_BATCH_SIZE,
      resolveLinkTos: false,
    };
    if( this.connection ) {
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

  /*
  loadEffects(features: IFeatureLoaded[]) {


    /**
     * TODO: create a function to subscribe for the eventTriggers in watchers
     * and a function to resolve all past events (in async start chain)
     /
    features.forEach((feature: IFeatureLoaded) => {

      if(feature.effects) {
        feature.effects.forEach((effect: IEffectLoaded) => {
          if( effect.triggerAfterCommand ) {

            let commandTriggers: string[] = [];
            if( Array.isArray(effect.triggerAfterCommand) ) commandTriggers = effect.triggerAfterCommand;
            else commandTriggers.push(effect.triggerAfterCommand);

            commandTriggers.forEach((commandTrigger: string) => {

              const alreadyAddedTriggerArray = this.effectWatchers.filter((effectWatcher) => {
                effectWatcher.eventTrigger === commandTrigger;
              });

              let trigger: {
                eventTrigger: string,
                effects: Array<{
                  effectName: string,
                  effectMethodRun: (eventNumber?: number | undefined, request?: any) => Promise<void>
                }>
              };

              if( alreadyAddedTriggerArray.length == 0 ) {

                trigger = {
                  eventTrigger: commandTrigger,
                  effects: [],
                };

                trigger.effects.push({
                  effectName: effect.name,
                  effectMethodRun: effect.run,
                });

                this.effectWatchers.push(trigger);
              } else {
                trigger = alreadyAddedTriggerArray[0];

                trigger.effects.push({
                  effectName: effect.name,
                  effectMethodRun: effect.run,
                });

                this.effectWatchers.map((effectWatcher) => {
                  if(effectWatcher.eventTrigger === trigger.eventTrigger) return trigger;
                  return effectWatcher;
                });
              }

            });

          }
        });
      }

    });

  }
  */

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
          this.connection = undefined;
          resolve();
        } else {
          resolve();
        }
      } else {
        resolve();
      }
    });
  }

  private async calculateFirstEventNumberToReduce() {
    this.firstEventNumberToReduce = Math.min(...[
      await ReducerController.getFirstEventNumberToReduce()
    ]);
  }

}
