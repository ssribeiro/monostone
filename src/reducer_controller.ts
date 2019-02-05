import * as ast from "@angstone/node-util";
import { error } from "./error";

import { ICommandLoaded, IFeatureLoaded, IReducer, IEventRead } from "./interfaces";

import { Controller } from './controller';
import { db } from "store";

import { EventController } from './event_controller';

export interface EventToReduce {
  commandType: string;
  reducer: IReducer | undefined;
  eventRead: IEventRead;
};

export class ReducerController implements Controller {

  private static REDUCER_CONTROLLER_NAME: string = "reducer_control";
  private static firstEventNumberToReduce: number = 0;

  private REDUCER_REST_TIME: number = 10;
  private SECURITY_TIME_DELAY_FOR_EMIT_REDUCED: number = 3;

  /**
   * list of reducers loaded
   */
  public reducers: any;

  /**
  * Stack of events to reduce
  */
  private eventStack: EventToReduce[] = [];

  private reducing: boolean = false;
  private lastTimeReducing: number = Date.now();
  private stopped: boolean = false;

  constructor() {
    ast.log("creating reducer controller");
    this.reducers = {};
  }

  public static async getFirstEventNumberToReduce(): Promise<number> {
    await ReducerController.registerDbControl();
    return ReducerController.firstEventNumberToReduce;
  }

  /**
   * Register the control data on database. This is necessary to coordinate
   * and grant stability and roughness to the system
   */
  private static async registerDbControl() {
    ast.log("registering db control");
    const oldRegister: any = await db.collection(ReducerController.REDUCER_CONTROLLER_NAME)
      .find({id: ReducerController.REDUCER_CONTROLLER_NAME}).toArray();

    if (oldRegister.length === 0) {
      await db.collection(ReducerController.REDUCER_CONTROLLER_NAME)
        .insertOne({
           endEvent: 0,
           id: ReducerController.REDUCER_CONTROLLER_NAME,
           startEvent: 0,
         });
      ReducerController.firstEventNumberToReduce = 0;
    } else {
      if ( oldRegister[0].startEvent === oldRegister[0].endEvent ) {
        ReducerController.firstEventNumberToReduce = oldRegister[0].endEvent;
      } else {
        error.fatal("unsyncronization in event reduce",
          "you must apply manual correction in db");
      }
    }
  }

  /**
   * starts the reducer reading and reducing all past events
   */
  public async start() {
    await this.reduce();
    await this.completePastReducing();
    ast.log("reducer controller started");
  }

  public async stop() {
    this.stopped = true;
    while ( ! await this.isFree() ) { await ast.delay(this.REDUCER_REST_TIME); }
  }

  public loadFeatures(features: IFeatureLoaded[]) {
    features.forEach((feature: IFeatureLoaded) => {
      if (feature.commands) {
        feature.commands.forEach((command: ICommandLoaded) => {
          if (command.reducer !== undefined) {
            this.reducers[command.commandType] = {
              reducer: command.reducer,
              subscription: EventController.eventRead$.addListener(
                command.commandType,
                ((eventRead: IEventRead,
              ) => {
                this.eventStack.push({
                  commandType: command.commandType,
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
          EventController.eventReduced$.emit(reduceRecipe.commandType, reduceRecipe.eventRead);
        }, this.SECURITY_TIME_DELAY_FOR_EMIT_REDUCED);
      }
    }
    await ast.delay(this.REDUCER_REST_TIME);
    if ( !this.stopped ) { this.reduce(); }
  }

  private async reduceMarkStart(eventNumber: number) {
    this.reducing = true;
    while ( db === undefined ) { await ast.delay(this.REDUCER_REST_TIME); }
    await db.collection(ReducerController.REDUCER_CONTROLLER_NAME)
      .updateOne({id: ReducerController.REDUCER_CONTROLLER_NAME}, { $set: { startEvent: eventNumber } });
  }

  private async reduceMarkEnd(eventNumber: number) {
    await db.collection(ReducerController.REDUCER_CONTROLLER_NAME)
      .updateOne({id: ReducerController.REDUCER_CONTROLLER_NAME}, { $set: { endEvent: eventNumber } });
    this.lastTimeReducing = Date.now();
    this.reducing = false;
  }

  /**
   * await all past events to be reduced
   */
  public async completePastReducing() {
    while ( !(this.eventStack.length === 0 && EventController.isStreamInLive) ) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, this.REDUCER_REST_TIME * 5);
      });
    }
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
