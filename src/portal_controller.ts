import * as ast from "@angstone/node-util";

import * as bodyParser from "body-parser";
import * as express from "express";
import * as http from "http";

import { Controller } from './controller';
import { EventController } from './event_controller';

import { IAuthToken } from "features/auth/interfaces/auth-token.i";
import { ICommandLoaded, IFeatureLoaded, IViewLoaded } from "interfaces";
import { CommandTools } from "tools";
import { error } from 'error';

import { messages as authMessages } from "features/auth/messages";
import * as AuthTools from "features/auth/tools";

interface ServerError extends Error {
  code: string | number;
}

/**
 * Portal to expose api resources
 */
export class PortalController extends Controller {

  public apiPort: number;
  public expressApp: express.Express;
  public httpServer: http.Server | null = null;

  constructor() {
    super();
    this.apiPort = +(process.env.API_PORT || 3002);
    this.expressApp = express();
    this.expressApp.use(bodyParser.json());
  }

  public loadFeatures(features: IFeatureLoaded[], viewsData: any) {
    ast.log("creating routes");
    this.routeSystem();
    this.routeFeatures(features, viewsData);
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
   * @param  viewData     stored data from views
   */
  private routeFeatures(features: IFeatureLoaded[], viewsData: any) {
    ast.log("adding the feature routes");
    features.forEach((feature) => {

      ast.log("found feature: " + feature.featureName);
      const featureRouter = express.Router();
      featureRouter.use(this.authMiddleware);

      if (feature.commands) {
        feature.commands.forEach((command) => {
          ast.log(" found command: " + command.commandName);

          featureRouter.post("/" + command.commandName,
            this.commandRequest(command));

          ast.log(" routed command " + command.commandName);
        });
      }

      if (feature.views) {

        feature.views.forEach((view) => {
          ast.log(" found view: " + view.viewName);
          featureRouter.get( "/" + view.viewName, this.viewRequest( view, viewsData ) );

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
  private commandRequest(command: ICommandLoaded): (
    req: express.Request,
    res: express.Response,
  ) => void {
    return (req: express.Request, res: express.Response) => {
      CommandTools.execute(command, req.body, EventController.eventReduced$)
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
   * @param  viewData [description]
   * @return           express function middleware
   */
  private viewRequest(view: IViewLoaded, viewsData: any): (
    req: express.Request,
    res: express.Response,
  ) => void {

    const viewData = viewsData[view.viewTag];

    if (view.renderPrivate && !view.renderPublic) {

      return (req: any, res: express.Response) => {
        if (req.token && view.renderPrivate) {
          view.renderPrivate( viewData, req.token )
            .then((ans: any) => res.status(200).send(ans))
            .catch((err: Error) => res.status(400).send(err));
        } else {
          res.status(401).send(authMessages.NO_TOKEN_PROVIDED);
        }
      };

    } else if (view.renderPrivate && view.renderPublic) {

      return (req: any, res: express.Response) => {
        if (req.token && view.renderPrivate) {
          view.renderPrivate( viewData, req.token )
            .then((ans: any) => res.status(200).send(ans))
            .catch((err: Error) => res.status(400).send(err));
        } else if (view.renderPublic){
          view.renderPublic( viewData )
            .then((ans: any) => res.status(200).send(ans))
            .catch((err: Error) => res.status(400).send(err));
        }
      };

    } else {
      if (view.renderPublic) {

        return (req: any, res: express.Response) => {
          if(view.renderPublic) {
            view.renderPublic( viewData )
              .then((ans: any) => res.status(200).send(ans))
              .catch((err: Error) => res.status(400).send(err));
          }
        };

      } else {
        return (req: any, res: express.Response) => { res.status(200).send({}); };
      }
    }

  }

  public isPortTaken (port: number): Promise<boolean> {
    return new Promise<boolean>( (resolve) => {
      /*const tester = net.createServer()
        .once('error', (err: ServerError) => {
          if (err.code == 'EADDRINUSE') resolve(true);
          else resolve(false);
        })
        .once('listening', () => {
          tester.once('close', () => { resolve(false); } )
          .close();
        })
        .listen(port);*/
      resolve(false);
    });
  };

}
