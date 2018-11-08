import "jasmine-expect";
import * as supertest from "supertest";

import { App } from "./app";
import { features as basicFeatures } from "./features";
import { messages } from "./features/auth/signup/signup.messages";

describe("App", () => {

  describe("Wiped Tests", () => {

    // let originalTimeout: number;
    let appWiped: App;
    let request: supertest.SuperTest<supertest.Test>;

    beforeEach((done) => {
      // originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      // jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
      process.env.API_PORT = "" + 3990;
      process.env.MONGO_DATABASE = "dev" + 90;
      appWiped = new App();
      appWiped.connectStore().then(() => {
        appWiped.systemTools.dbDrop().then(() => {
          appWiped.systemTools.eventClear().then(() => {
            appWiped.start().then(() => {
              request = supertest(appWiped.portal.expressApp);
              done();
            });
          });
        });
      });
    });

    afterEach((done) => {
       // jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
       appWiped.stop().then(done);
     });

    afterAll((done) => {
      appWiped = new App();
      appWiped.connectStore().then(() => {
        appWiped.systemTools.dbDrop().then(() => {
          appWiped.systemTools.eventClear().then(() => {
            appWiped.stop().then(done);
          });
        });
      });
    });

    it("should load the apiPort", () => {
      if (process.env.API_PORT) {
        expect(appWiped.portal.apiPort).toBe(+process.env.API_PORT);
      } else {
        expect(appWiped.portal.apiPort).toBe(3002);
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

    describe("loadFeatures function", () => {

      it("should load features", () => {
        expect(appWiped.features).toEqual(basicFeatures());
      });

    });

    it("should fail signup an user in expected way", (done) => {
      const userInfo = {
        login: "userlogin",
        name: "user name",
        password: "secreto1",
        password_confirmation: "secreto2",
      };
      (request.post("/auth/signup") as supertest.Test)
        .send(userInfo)
        .expect(400, messages.WRONG_PASSWORD_CONFIRMATION, done);
    });

    it("should signup an user and give us the id", (done) => {
      const userInfo = {
        login: "userlogin",
        name: "user name",
        password: "secreto123",
        password_confirmation: "secreto123",
      };
      (request.post("/auth/signup") as supertest.Test)
        .send(userInfo)
        .expect(200)
        .then((response) => {
          expect(response.body.userId).toBeNumber();
          expect(response.body.userId).toBeGreaterThan(-1);
          done();
        });
    });

  });

});
