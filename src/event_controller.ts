import * as ast from "@angstone/node-util";
import {
  Connection,
  ICredentials
} from "event-store-client";
import { EventEmitter } from "events";
import { error } from "./error";
import { IFeatureLoaded, IViewLoaded, IEffectLoaded } from "./interfaces";

import { ReducerController } from './reducer_controller';

// TODO: Create view controller and effect controller separated files

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

  private effectWatchers: Array<{
    eventTrigger: string,
    effects: Array<{
      effectName: string,
      effectMethodRun: (eventNumber?: number | undefined, request?: any) => Promise<void>,
    }>,
  }> = [];

  /**
   * Connection with Event Store
   */
  private connection: Connection;

  public nextEventNumberToReduce: number = 0;
  public closed: boolean = false;
  private credentials: ICredentials;
  private RENDER_REST_TIME: number = 10;

  private rendering: boolean = false;
  private lastTimeRendering: number = Date.now();

  public reducerController: ReducerController;

  private FREE_REST_TIME: number = 10;

  constructor() {
    ast.log("creating event controller");

    this.eventRead$ = new EventEmitter();
    this.eventRead$.setMaxListeners(Infinity);
    this.eventReduced$ = new EventEmitter();
    this.eventReduced$.setMaxListeners(Infinity);

    this.credentials = {
      password: process.env.EVENT_SOURCE_PASSWORD || "changeit",
      username: process.env.EVENT_SOURCE_USERNAME || "admin",
    };
    ast.log("creating connection to event store");
    this.connection = this.createConnection();
    ast.log("event store connected");

    this.reducerController = new ReducerController(
      this.connection,
      this.credentials,
      this.eventRead$,
      this.eventReduced$
    );
  }

  /**
   * stops the event controller after free all tasks
   */
  public async stop() {
    ast.log("stoping event controller");
    await this.reducerController.stop();
    while ( ! await this.isFree() ) { await ast.delay(this.FREE_REST_TIME); }
    await this.closeConnection();
    ast.log("connection closed");
  }

  /**
   * starts event controller
   */
  public async start() {
    ast.log("starting event controller");
    ast.log("starting reducer");
    await this.reducerController.start();
    ast.log("event controller ready");
  }

  public loadFeatures(features: IFeatureLoaded[]) {
    this.reducerController.loadReducers(features);
    this.loadViews(features);
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

  loadEffects(features: IFeatureLoaded[]) {

    /**
     * TODO: create a function to subscribe for the eventTriggers in watchers
     * and a function to resolve all past events (in async start chain)
     */
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

  /**
   * check if it does not have ongoing tasks
   * @return boolean
   */
  public async isFree(): Promise<boolean> {
    return await this.reducerController.isFree() && await this.isRenderFree();
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

  public async completePastEventTasks() {
    await this.reducerController.completePastReducing();
  }

}
