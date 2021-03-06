// Util functions used mainly to change color
import * as ast from "@angstone/node-util"
// error handler
import { error } from "./error"
import * as express from "express"

// framework modules
import {
  EventModule,
  PortalModule,
  ReducerModule,
  ViewModule,
  EffectModule,
  CronjobModule
} from "./modules"
// import { CronjobController } from "./cronjob_controller";
// framework store
import { closeStore, connectStore } from "./store"
// framework tools
import { GeneralTools, EventTools, SystemTools, FeatureTools } from "./tools"
// interfaces
import { IFeature, IFeatureLoaded, IMonoModule, ICommand } from "./interfaces"
// framework system commands
import * as SystemCommands from "./system_commands"

export class App {

  private static FREE_REST_TIME: number = 10

  public monoModules: IMonoModule[]
  // public cronjobController: CronjobController;
  public features: IFeatureLoaded[] = []
  /**
   * used when application stops
   */
  public stopped: boolean = false
  public stopping: boolean = false
  /**
   * time in milliseconds gmt 0 since aplication was loaded
   */
  public timeLoaded: number | null = null
  /**
   * time in milliseconds gmt 0 since aplication was started
   */
  public timeStarted: number
  public rethinkDbConnected: boolean = false
  public systemTools = SystemTools

  public customFeaturesPath: string | undefined = undefined

  /**
   * Creates the main application
   */
  constructor() {
    this.timeStarted = Date.now()
    this.config()

    this.monoModules = [
      EventModule,
      ReducerModule,
      ViewModule,
      EffectModule,
      PortalModule,
      CronjobModule
    ]

    this.monoModules.forEach(monoModule => monoModule.config())
    global.monoApp = this;
  }

  public async connectStore() {
    await connectStore()
  }

  public async start() {
    await EventTools.send({ command: SystemCommands.starting })

    await this.connectStore()

    this.features = this.loadFeatures()

    this.monoModules.forEach( controller =>
      controller.loadFeatures(this.features) )
    await GeneralTools.asyncForEach( this.monoModules,
      async (monoModule: IMonoModule) => await monoModule.start() )

    this.timeLoaded = Date.now();
    const systemInfo = { load_time: this.timeLoaded - this.timeStarted }
    await this.sendCommand( SystemCommands.started, systemInfo )
  }

  public async stop() {
    if ( !this.stopping && !this.stopped ) {
      this.stopping = true;

      while ( ! await this.isFree() ) { await ast.delay(App.FREE_REST_TIME); }

      await GeneralTools.asyncForEach( this.monoModules.reverse(),
        async (monoModule: IMonoModule) => await monoModule.stop() );

      await closeStore();
      this.stopped = true;
    }
  }

  public async sendCommand(command: ICommand, request?: any): Promise<any> {
    return await EventTools.send({command, request})
  }

  private config() {
    if (process.env.NODE_ENV === "production"
      || process.env.NODE_ENV === "development")
      ast.success("configuration loaded")
    else
      error.fatal("configuration failed - please verify .env file")

    ast.info("configured environment: " + process.env.NODE_ENV)
    this.customFeaturesPath = process.env.FEATURES_PATH
  }

  private loadFeatures(): IFeatureLoaded[] {
    ast.log("loadind features")

    let BasicFeatures: IFeature[] = []

    try {
      BasicFeatures = require('./features').features
    } catch (e) {
      BasicFeatures = FeatureTools.getRecipesFromFolderStructure()
    } finally {

      let features = [...BasicFeatures]
      if(this.customFeaturesPath) {

        features =
          FeatureTools.getRecipesFromFolderStructure(this.customFeaturesPath)
          .concat(features)

      }

      return FeatureTools.createFeatures( features )
    }
  }

  /**
   * check if it does not have ongoing tasks
   * @return boolean
   */
  public async isFree(): Promise<boolean> {
    for (const controller of this.monoModules) {
      if(!await controller.isFree()) return false
    }
    return true
  }

  public getExpressPortal(): express.Express {
    return PortalModule.getExpressApp()
  }

}

export const devWipeAll = (done: Function) => {
  if( process.env.NODE_ENV=='production' )
    throw new Error("not allowed in production")
  else {
    let appWiped = new App();
    appWiped.connectStore().then(() => {
      appWiped.systemTools.dbDrop().then(() => {
        appWiped.systemTools.eventClear().then(() => {
          done();
        });
      });
    });
  }
}

export const devWipeDb = (done: Function) => {
  if( process.env.NODE_ENV=='production' )
    throw new Error("not allowed in production")
  else {
    let appWiped = new App();
    appWiped.connectStore().then(() => {
      appWiped.systemTools.dbDrop().then(() => {
        done();
      });
    });
  }
}
