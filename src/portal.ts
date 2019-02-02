import * as ast from "@angstone/node-util";

import * as bodyParser from "body-parser";
import * as express from "express";
import * as http from "http";
import * as net from "net";

import { EventEmitter } from "events";
import { IAuthToken } from "features/auth/interfaces/auth-token.i";
import { ICommand, IFeatureLoaded, IViewLoaded } from "interfaces";
import { CommandTools, ViewTools } from "tools";
import { error } from 'error';

import { messages as authMessages } from "features/auth/messages";
import * as AuthTools from "features/auth/tools";

interface ServerError extends Error {
  code: string | number;
}

/**
 * Portal to expose api resources
 */
export class Portal {

  public apiPort: number;
  public expressApp: express.Express;
  public httpServer: http.Server | null = null;

  constructor() {
    this.apiPort = +(process.env.API_PORT || 3002);
    this.expressApp = express();
    this.expressApp.use(bodyParser.json());
  }

  public route(features: IFeatureLoaded[], eventReduced$: EventEmitter, viewsData: any) {
    ast.log("creating routes");
    this.routeSystem();
    this.routeFeatures(features, eventReduced$, viewsData);
  }

  public start(): Promise<void> {
    return new Promise<void>( (resolve, reject) => {
      ast.log("testing http port use");

      this.isPortTaken(this.apiPort).then( (isTaken: boolean) => {
        if (isTaken) {
          reject("The port '" + this.apiPort + "' is already being used!'");
        } else {

          this.httpServer = http.createServer(this.expressApp);
          this.httpServer.once('listening', () => {
            ast.log("Express Server listening on port " + this.apiPort);
            resolve();
          });
          this.httpServer.on('error', (e: ServerError) => {
            error.fatal(e);
            reject();
          });

          this.httpServer.listen.apply(this.httpServer, [{
            host: 'localhost',
            port: this.apiPort,
          }]);

        }
      }).catch( (err: any) => {
        reject("failure when testing http server api port");
      });

    });
  }

  public stop(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.httpServer) {
        this.httpServer.close((error: any) => {
          if (error) {
            reject(error);
          } else {
            ast.info("http server closed");
            resolve();
          }
        });
      } else {
        ast.info("http server never started");
        resolve();
      }
    });
  }

  /**
   * Middleware to handle authentication
   * @param req  the request
   * @param res  the response
   * @param next called at end
   */
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
        res.status(401).send(err.message || err.msg || "unknown");
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

  /**
   * Route each feature
   * @param  features      loaded features
   * @param  eventReduced$ reduced events stream
   * @param  viewsData     stored data from views
   */
  private routeFeatures(features: IFeatureLoaded[], eventReduced$: EventEmitter, viewsData: any) {
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

  /**
   * Generate the request for each command
   * @param  command       [description]
   * @param  eventReduced$ stream of reduced events
   * @return               express function midlleware
   */
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

  /**
   * Generate the request for each view
   * @param  view      [description]
   * @param  viewTag   [description]
   * @param  viewsData [description]
   * @return           express function middleware
   */
  private viewRequest(view: IViewLoaded, viewTag: string, viewsData: any): (
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

  public isPortTaken (port: number): Promise<boolean> {
    return new Promise<boolean>( (resolve) => {
      const tester = net.createServer()
        .once('error', (err: ServerError) => {
          if (err.code == 'EADDRINUSE') resolve(true);
          else resolve(false);
        })
        .once('listening', () => {
          tester.once('close', () => { resolve(false); } )
          .close();
        })
        .listen(port);
    });
  };

}
