// Util functions used mainly to change color
import * as ast from "@angstone/node-util"
// error handler
import { error } from "./error"
// configurations
import { config as configTool } from "./config"
// framework modules
import {
  EventModule,
  PortalModule,
  ReducerModule,
  ViewModule,
  EffectModule
} from "./modules"
// import { CronjobController } from "./cronjob_controller";
// framework store
import { closeStore, connectStore } from "./store"
// framework tools
import { GeneralTools, EventTools, SystemTools, FeatureTools } from "./tools"
// interfaces
import { IFeature, IFeatureLoaded, IMonoModule } from "./interfaces"
// framework system commands
import * as SystemCommands from "./system_commands"

export class App {

  private static FREE_REST_TIME: number = 10

  public monoModules: IMonoModule[]
  // public cronjobController: CronjobController;
  public features: IFeatureLoaded[]
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

  /**
   * Creates the main application
   */
  constructor() {
    this.timeStarted = Date.now()
    this.config()

    this.features = this.loadFeatures()

    this.monoModules = [
      EventModule,
      ReducerModule,
      ViewModule,
      PortalModule,
      EffectModule,
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
    this.monoModules.forEach( controller =>
      controller.loadFeatures(this.features) )
    await GeneralTools.asyncForEach( this.monoModules,
      async (monoModule: IMonoModule) => await monoModule.start() )

    this.timeLoaded = Date.now();
    const systemInfo = { load_time: this.timeLoaded - this.timeStarted }
    await EventTools.send({
      command: SystemCommands.started,
      request: systemInfo
    })
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

  private config() {
    configTool()

    if (process.env.NODE_ENV === "production"
      || process.env.NODE_ENV === "development")
      ast.success("configuration loaded")
    else
      error.fatal("configuration failed - please verify .env file")

    ast.info("configured environment: " + process.env.NODE_ENV)
  }

  private loadFeatures(): IFeatureLoaded[] {
    ast.log("loadind features")

    let BasicFeatures: IFeature[] = []

    try {
      BasicFeatures = require('./features').features
    } catch (e) {
      BasicFeatures = FeatureTools.getRecipesFromFolderStructure()
    } finally {
      // TODO: Add support for loading external features here in future.
      const features = [...BasicFeatures]
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

}
