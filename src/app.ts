import * as ast from '@angstone/node-util';
import * as express from 'express';

export class App {

  public api_port: number;
  public express_app: express.Express;

  constructor() {
    this.api_port = +(process.env.API_PORT || 3002);
    this.express_app = express();
    this.route();
  }

  route() {
    ast.log('creating routes');
    const router = express.Router();

    router.get('/ping', (res: express.Response) => {
      res.send('pong');
    });

    ast.log('adding routes');
    this.express_app.use('/', router);
    ast.log('routes added');
  }

  start() {
    this.express_app.listen(this.api_port, () =>
      ast.log('Express Server listening on port ' + this.api_port)
    );
  }

}
