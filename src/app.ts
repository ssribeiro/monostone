import * as ast from "@angstone/node-util";

import { config } from "./config";
import { error } from "./error";
import { EventController } from "./event_controller";
import { features as basicFeatures } from "./features";
import { IFeature } from "./interfaces";
import { Portal } from "./portal";
import { closeStore, connectStore } from "./store";
import * as SystemCommands from "./system_commands";
import { EventTools, SystemTools } from "./tools";

export class App {

  public eventController: EventController;
  public features: IFeature[];
  public portal: Portal;

  public timeLoaded: number | null = null;
  public timeStarted: number;
  public rethinkDbConnected: boolean = false;

  public systemTools = SystemTools;

  constructor() {
    this.timeStarted = Date.now();
    this.config();

    this.portal = new Portal();

    this.features = this.loadFeatures();
    this.eventController = new EventController();

    this.portal.route(this.features, this.eventController.eventReduced$);
  }

  public async connectStore() {
    await connectStore();
  }

  public async start() {
    await EventTools.send({ command: SystemCommands.starting });

    await this.connectStore();

    this.eventController.loadReducers(this.features);

    this.eventController.start();
    await this.eventController.completePastReducing();

    this.timeLoaded = Date.now();
    const systemInfo = {
      load_time: this.timeLoaded - this.timeStarted,
    };
    await EventTools.send({ command: SystemCommands.started, request: systemInfo});

    await this.portal.start();

    await EventTools.send({ command: SystemCommands.apiOpened });
  }

  public async stop() {
    await this.portal.stop();
    // await ast.delay(100);
    await this.eventController.stop();
    // await ast.delay(100);
    await closeStore();
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
