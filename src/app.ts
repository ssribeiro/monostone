// Util functions used mainly to change color
import * as ast from "@angstone/node-util";
// error handler
import { error } from "./error";

// configurations
import { config as configTool } from "./config";

// framework controllers
import { Controller } from "./controller";
import { CronjobController } from "./cronjob_controller";
import { EventController } from "./event_controller";
import { PortalController } from "./portal_controller";
import { ReducerController } from "./reducer_controller";
import { ViewController } from "./view_controller";

// framework store
import { closeStore, connectStore } from "./store";

// framework tools
import { GeneralTools, EventTools, SystemTools, FeatureTools } from "./tools";

// interfaces
import { IFeature, IFeatureLoaded } from "./interfaces";

// framework system commands
import * as SystemCommands from "./system_commands";

export class App {

  private static FREE_REST_TIME: number = 10;

  public controllers: Controller[];
  // public cronjobController: CronjobController;
  public eventController: EventController;
  public portalController: PortalController;
  public reducerController: ReducerController;
  public viewController: ViewController;

  public features: IFeatureLoaded[];

  /**
   * used when application stops
   */
  public stopped: boolean = false;
  public stopping: boolean = false;

  /**
   * time in milliseconds gmt 0 since aplication was loaded
   */
  public timeLoaded: number | null = null;

  /**
   * time in milliseconds gmt 0 since aplication was started
   */
  public timeStarted: number;

  public rethinkDbConnected: boolean = false;

  public systemTools = SystemTools;

  /**
   * Creates the main application
   */
  constructor() {
    this.timeStarted = Date.now();
    this.config();

    this.features = this.loadFeatures();

    this.eventController = new EventController();
    this.reducerController = new ReducerController();
    this.viewController = new ViewController();
    // this.cronjobController = new CronjobController();
    this.portalController = new PortalController();

    this.controllers = [
      this.eventController,
      this.reducerController,
      this.viewController,
      // this.cronjobController
    ];

    this.portalController.loadFeatures(this.features, this.viewController.viewsData);

    global.monoApp = this;
  }

  public async connectStore() {
    await connectStore();
  }

  public async start() {

    await EventTools.send({ command: SystemCommands.starting });

    await this.connectStore();

    this.controllers.forEach( controller => controller.loadFeatures(this.features) );

    await GeneralTools.asyncForEach( this.controllers,
      async (controller: Controller) => await controller.start()
    );
    await this.portalController.start();

    this.timeLoaded = Date.now();
    const systemInfo = {
      load_time: this.timeLoaded - this.timeStarted,
    };
    await EventTools.send({ command: SystemCommands.started, request: systemInfo});

  }

  public async stop() {
    if ( !this.stopping && !this.stopped ) {
      this.stopping = true;

      while ( ! await this.isFree() ) { await ast.delay(App.FREE_REST_TIME); }

      await this.portalController.stop();
      await GeneralTools.asyncForEach( this.controllers.reverse(),
        async (controller: Controller) => await controller.stop()
      );

      await closeStore();
      this.stopped = true;
    }
  }

  private config() {
    configTool();
    if (process.env.NODE_ENV === "production"
      || process.env.NODE_ENV === "development") {
      ast.success("configuration loaded");
    } else {
      error.fatal("configuration failed - please verify .env file");
    }
    ast.info("configured environment: " + process.env.NODE_ENV);
  }

  private loadFeatures(): IFeatureLoaded[] {
    ast.log("loadind features");

    let BasicFeatures: IFeature[] = [];

    try {
      BasicFeatures = require('./features').features;
    } catch (e) {
      BasicFeatures = FeatureTools.getRecipesFromFolderStructure();
    } finally {

      // TODO: Add support for loading external features here in future.
      const features = [...BasicFeatures];
      return FeatureTools.createFeatures( features );
    }

  }

  /**
   * check if it does not have ongoing tasks
   * @return boolean
   */
  public async isFree(): Promise<boolean> {
    for (const controller of this.controllers) {
      if(!await controller.isFree()) return false;
    }
    return true;
  }

}
