import * as ast from "@angstone/node-util";

import * as bodyParser from "body-parser";
import * as express from "express";
import * as http from "http";

import { EventEmitter } from "events";
import { ICommand, IFeature } from "./interfaces";
import { CommandTools } from "./tools";

export class Portal {

  public apiPort: number;
  public expressApp: express.Express;
  public expressServer: http.Server | null = null;

  constructor() {
    this.apiPort = +(process.env.API_PORT || 3002);
    this.expressApp = express();
    this.expressApp.use(bodyParser.json());
  }

  public route(features: IFeature[], eventReduced$: EventEmitter) {
    ast.log("creating routes");
    this.routeSystem();
    this.routeFeatures(features, eventReduced$);
  }

  public start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.expressServer = this.expressApp.listen(this.apiPort, (error: any) => {
        if (error) {
          reject(error);
        } else {
          ast.log("Express Server listening on port " + this.apiPort);
          resolve();
        }
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.expressServer) {
        this.expressServer.close((error: any) => {
          if (error) {
            reject(error);
          } else {
            ast.info("server closed");
            resolve();
          }
        });
      } else {
        ast.info("server never started");
        resolve();
      }
    });
  }

  private routeSystem() {
    ast.log("adding system routes");
    const router = express.Router();

    router.get("/ping", (req: express.Request, res: express.Response) => {
      res.send("pong");
    });

    this.expressApp.use("/", router);
    ast.log("system routes added");
  }

  private routeFeatures(features: IFeature[], eventReduced$: EventEmitter) {
    ast.log("adding the feature routes");
    features.forEach((feature) => {

      ast.log("found feature: " + feature.featureName);
      const featureRouter = express.Router();

      if (feature.commands) {
        feature.commands.forEach((command) => {
          ast.log(" found command: " + command.commandName);

          featureRouter.post("/" + command.commandName,
            this.commandRequest(command, eventReduced$));

          ast.log(" routed command " + command.commandName);
        });
      }

      this.expressApp.use("/" + feature.featureName, featureRouter);
      ast.log("routed feature " + feature.featureName);

    });
  }

  private commandRequest(command: ICommand, eventReduced$: EventEmitter): (
    req: express.Request,
    res: express.Response,
  ) => void {
    return (req: express.Request, res: express.Response) => {
      CommandTools.execute(command, req.body, eventReduced$)
        .then((ans: any) => res.status(200).send(ans))
        .catch((err: Error) => {
          ast.dev(err);
          res.status(400).send(err);
        });
    };
  }

}
