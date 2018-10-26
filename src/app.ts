import * as ast from "@angstone/node-util";

import { config } from "./config";
import { error } from "./error";
import { EventController } from "./event_controller";
import { features as basicFeatures } from "./features";
import { IFeature } from "./interfaces";
import { Portal } from "./portal";
import * as SystemCommands from "./system_commands";
import { EventTools, SystemTools } from "./tools";

export class App {

  public eventController: EventController;
  public features: IFeature[];
  public portal: Portal;

  public timeLoaded: number | null = null;
  public timeStarted: number;
  public rethinkDevConnected: boolean = false;

  public systemTools = SystemTools;

  constructor() {
    this.timeStarted = Date.now();
    this.config();

    this.portal = new Portal();

    this.features = this.loadFeatures();
    this.eventController = new EventController();

    this.portal.route(this.features, this.eventController.eventReduced$);
  }

  public async grantDb() {
    await SystemTools.use();
    if (! await SystemTools.dbCheck()) {
      await SystemTools.dbCreate();
    }
  }

  public async start() {
    await this.grantDb();
    this.loadReducers();
    this.startEventController();
    await this.reducePast();

    this.timeLoaded = Date.now();
    const systemInfo = {
      load_time: this.timeLoaded - this.timeStarted,
    };
    await EventTools.send({ command: SystemCommands.started, request: systemInfo});

    await this.startPortal();

    await EventTools.send({ command: SystemCommands.apiOpened });
  }

  public async startPortal() {
    await this.portal.start();
  }

  public async stopPortal() {
    await this.portal.stop();
  }

  public loadReducers() {
    this.eventController.loadReducers(this.features);
  }

  public startEventController() {
    this.eventController.start();
  }

  public stopEventController() {
    this.eventController.stop();
  }

  public async reducePast() {
    await this.eventController.completePastReducing();
  }

  public async stop() {
    await this.stopPortal();
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });

    await this.stopEventController();
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }

  public reloadFeatures() {
    this.features = this.loadFeatures();
  }

  private config() {
    config();
    if (process.env.NODE_ENV === "production"
      || process.env.NODE_ENV === "development") {
      ast.success("configuration loaded");
    } else {
      error.fatal("configuration failed - please verify .env file");
    }
    ast.info("configured environment: " + process.env.NODE_ENV);
  }

  private loadFeatures(): IFeature[] {
    ast.log("loadind features");
    return [...basicFeatures()];
  }

}
