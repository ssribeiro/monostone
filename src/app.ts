import * as ast from "@angstone/node-util";
import * as express from "express";
import { features as basicFeatures } from "./features";
import { ICommand, IFeature } from "./interfaces";

export class App {

  public apiPort: number;
  public expressApp: express.Express;
  public features: IFeature[];

  constructor() {
    this.apiPort = +(process.env.API_PORT || 3002);
    this.expressApp = express();
    ast.log("loadind features");
    this.features = this.loadFeatures();
    this.route();
  }

  public start() {
    this.expressApp.listen(this.apiPort, () =>
      ast.log("Express Server listening on port " + this.apiPort),
    );
  }

  private route() {
    ast.log("creating routes");
    this.routeSystem();
    this.routeFeatures();
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

  private routeFeatures() {
    ast.log("adding the feature routes");
    this.features.forEach((feature) => {

      ast.log("found feature: " + feature.featureName);
      const featureRouter = express.Router();

      if (feature.commands) {
        feature.commands.forEach((command) => {
          ast.log(" found command: " + command.commandName);

          featureRouter.post("/" + command.commandName,
            this.commandRequest(command));

          ast.log(" routed command " + command.commandName);
        });
      }

      this.expressApp.use("/" + feature.featureName, featureRouter);
      ast.log("routed feature " + feature.featureName);

    });
  }

  private commandRequest(command: ICommand): (
    req: express.Request,
    res: express.Response,
  ) => void {
    return (req: express.Request, res: express.Response) => {
      command.request(req)
        .then((ans: any) => res.send(ans))
        .catch((err: Error) => res.status(400).send(err.message));
    };
  }

  private loadFeatures(): IFeature[] {
    return [...basicFeatures];
  }

}
