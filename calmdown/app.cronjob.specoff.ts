import * as ast from "@angstone/node-util";

import "jasmine-expect";
import * as supertest from "supertest";

import { messages } from "../features/auth/messages";

import { App } from "../app";

describe("App", () => {

  describe("CronJob Test", () => {

   let appOneInstance: App;
   let request: supertest.SuperTest<supertest.Test>;
   // let originalTimeout: number;

   function clearDb(db: string, cb: any) {
     process.env.MONGO_DATABASE = db;
     appOneInstance = new App();
     appOneInstance.start().then(() => {
       appOneInstance.systemTools.dbDrop().then(() => {
         appOneInstance.systemTools.eventClear().then(() => {
           appOneInstance.stop().then(cb);
         });
       });
     });
   }

   beforeAll((done) => {
     // originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
     // jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
     process.env.FEATURE_AUTH_EXPIRATION = "500";
     clearDb("dev4002", done);
   });

   afterAll((done) => {
     // jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
     appOneInstance = new App();
     appOneInstance.start().then(() => {
       appOneInstance.systemTools.dbDrop().then(() => {
         appOneInstance.systemTools.eventClear().then(() => {
           appOneInstance.stop().then(done);
         });
       });
     });
   });

   it("should deny render private view if took so long", (done) => {
     process.env.API_PORT = "3444";
     process.env.MONGO_DATABASE = "dev4002";
     process.env.FEATURE_AUTH_EXPIRATION = "100";
     appOneInstance = new App();
     appOneInstance.start().then(() => {
       request = supertest(appOneInstance.portal.expressApp);
       const userInfo = {
         login: "safelogin",
         name: "safe user name",
         password: "safepass123",
         password_confirmation: "safepass123",
       };
       const loginInfo = {
         deviceId: "rasp234jif4732f489348f",
         deviceType: "android",
         login: userInfo.login,
         password: userInfo.password,
       };
       (request.post("/auth/signup") as supertest.Test)
         .send(userInfo)
         .expect(200)
         .then((response) => {
           expect(response.body.userId).toBeNumber();
           expect(response.body.userId).toBeGreaterThan(-1);
           (request.post("/auth/login") as supertest.Test)
            .send(loginInfo)
            .expect(200)
            .then((responseTwo) => {
              expect(responseTwo.body).toBeDefined();
              expect(responseTwo.body.token).toBeDefined();
              expect(responseTwo.body.token).toBeString();
              ast.delay(1500).then(() => {
                request = supertest(appOneInstance.portal.expressApp);
                (request.get("/auth/session") as supertest.Test)
                  .set("token", responseTwo.body.token)
                  .expect(401)
                  .then((responseThree) => {
                    expect(responseThree.text).toEqual(messages.TOKEN_EXPIRED);
                    appOneInstance.stop().then(done);
                  });
              });
            });
         });
     });
   });

  });

});
