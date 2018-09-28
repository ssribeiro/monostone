import "jasmine";
import "jasmine-expect";
import * as supertest from "supertest";
import { App } from "./app";

describe("App", () => {

  let app: App;
  let request: supertest.SuperTest<supertest.Test>;

  beforeEach(() => {
    app = new App();
    request = supertest(app.expressApp);
  });

  it("should load the apiPort", () => {
    if (process.env.API_PORT) {
      expect(app.apiPort).toBe(+process.env.API_PORT);
    } else {
      expect(app.apiPort).toBe(3002);
    }
  });

  it("should respond a ping", () => {
    (request.get("/ping") as supertest.Test)
      .expect(200, "pong")
      .end((err) => {
        if (err) { throw err; }
        expect(err).toBeNull();
      });
  });

});
