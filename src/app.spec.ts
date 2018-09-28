import "jasmine-expect";
import { App } from './app';
import * as supertest from 'supertest';

describe('App', () => {

  let app: App;
  let request: supertest.SuperTest<supertest.Test>;

  beforeEach(() => {
    app = new App();
    request = supertest(app.express_app);
  });

  it('should load the api_port', () => {
    if (process.env.API_PORT) expect(app.api_port).toBe(+process.env.API_PORT);
    else expect(app.api_port).toBe(3002);
  });

  it('should respond a ping', () => {
    (request.get('/ping') as supertest.Test)
      .expect(200, 'pong')
      .end((err) => {
        if (err) throw err;
        expect(err).toBeNull();
      });
  });

});
