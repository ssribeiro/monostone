import * as ast from "@angstone/node-util";
import * as express from "express";

export class App {

  public apiPort: number;
  public expressApp: express.Express;

  constructor() {
    this.apiPort = +(process.env.API_PORT || 3002);
    this.expressApp = express();
    this.route();
  }

  public route() {
    ast.log("creating routes");
    const router = express.Router();

    router.get("/ping", (req: express.Request, res: express.Response) => {
      res.send("pong");
    });

    ast.log("adding routes");
    this.expressApp.use("/", router);
    ast.log("routes added");
  }

  public start() {
    this.expressApp.listen(this.apiPort, () =>
      ast.log("Express Server listening on port " + this.apiPort),
    );
  }

}
