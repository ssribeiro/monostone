// Util functions used mainly to change color
import * as ast from "@angstone/node-util";

// configurations
import { config as configTool } from "./config";
// error handler
import { error } from "./error";

import { CronjobController } from "./cronjob_controller";
import { EventController } from "./event_controller";
import { IFeature, IFeatureLoaded } from "./interfaces";

import { Portal } from "./portal";

import { closeStore, connectStore } from "./store";

import * as SystemCommands from "./system_commands";
import { EventTools, SystemTools, FeatureTools } from "./tools";

export class App {

  public cronjobController: CronjobController;
  public eventController: EventController;
  public features: IFeatureLoaded[];

  public portal: Portal;

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

    this.portal = new Portal();

    this.features = this.loadFeatures();

    this.eventController = new EventController();
    this.cronjobController = new CronjobController();

    this.portal.route(this.features,
      this.eventController.eventReduced$,
      this.eventController.viewsData);
  }

  public async connectStore() {
    await connectStore();
  }

  public async start() {
    await EventTools.send({ command: SystemCommands.starting });

    await this.connectStore();

    this.eventController.loadFeatures(this.features);

    this.eventController.start();
    await this.eventController.completePastEventTasks();
    await this.eventController.renderViews();

    this.cronjobController.loadCronjobs(this.features);
    this.cronjobController.start();

    this.timeLoaded = Date.now();
    const systemInfo = {
      load_time: this.timeLoaded - this.timeStarted,
    };
    await EventTools.send({ command: SystemCommands.started, request: systemInfo});

    await this.portal.start();

    await EventTools.send({ command: SystemCommands.apiOpened });
  }

  public async stop() {
    if ( !this.stopping && !this.stopped ) {
      this.stopping = true;
      await this.portal.stop();
      await this.cronjobController.stop();
      await this.eventController.stop();
      await closeStore();
      this.stopped = true;
    }
  }

  public reloadFeatures() {
    this.features = this.loadFeatures();
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

}
