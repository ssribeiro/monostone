import * as ast from "@angstone/node-util";

import * as bodyParser from "body-parser";
import * as express from "express";
import * as http from "http";

import { EventEmitter } from "events";
import { IAuthToken } from "./features/auth/auth-token.i";
import { ICommand, IFeature, IView } from "./interfaces";
import { CommandTools, ViewTools } from "./tools";

import { messages as authMessages } from "./features/auth/messages";
import * as AuthTools from "./features/auth/tools";

export class Portal {

  public apiPort: number;
  public expressApp: express.Express;
  public expressServer: http.Server | null = null;

  constructor() {
    this.apiPort = +(process.env.API_PORT || 3002);
    this.expressApp = express();
    this.expressApp.use(bodyParser.json());
  }

  public route(features: IFeature[], eventReduced$: EventEmitter, viewsData: any) {
    ast.log("creating routes");
    this.routeSystem();
    this.routeFeatures(features, eventReduced$, viewsData);
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

  private authMiddleware(
    req: any,
    res: express.Response,
    next: any,
  ): void {
    const tokenHeader = req.get("token");
    if (tokenHeader) {
      AuthTools.decodeToken(tokenHeader).then((decoded: IAuthToken) => {
        req.token = decoded;
        next();
      }).catch((err: any) => {
        res.status(401).send("Failure decoding token: " + err.message);
      });
    } else {
      next();
    }
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

  private routeFeatures(features: IFeature[], eventReduced$: EventEmitter, viewsData: any) {
    ast.log("adding the feature routes");
    features.forEach((feature) => {

      ast.log("found feature: " + feature.featureName);
      const featureRouter = express.Router();
      featureRouter.use(this.authMiddleware);

      if (feature.commands) {
        feature.commands.forEach((command) => {
          ast.log(" found command: " + command.commandName);

          featureRouter.post("/" + command.commandName,
            this.commandRequest(command, eventReduced$));

          ast.log(" routed command " + command.commandName);
        });
      }

      if (feature.views) {

        feature.views.forEach((view) => {
          ast.log(" found view: " + view.viewName);

          const viewTag: string = view.featureName + " " + view.viewName;
          featureRouter.get("/" + view.viewName,
            this.viewRequest(view, viewTag, viewsData));

          ast.log(" routed view " + view.viewName);
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

  private viewRequest(view: IView, viewTag: string, viewsData: any): (
    req: express.Request,
    res: express.Response,
  ) => void {
    return (req: any, res: express.Response) => {
      ViewTools.renderRequestView(view, viewsData[viewTag], req.token)
        .then((ans: any|undefined) => {
          if (ans) {
            res.status(200).send(ans);
          } else {
            res.status(401).send(authMessages.NO_TOKEN_PROVIDED);
          }
        })
        .catch((err: Error) => {
          ast.dev(err);
          res.status(400).send(err);
        });
    };
  }

}
