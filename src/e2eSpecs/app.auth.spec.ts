// import * as ast from "@angstone/node-util";
import "jasmine-expect";
import * as supertest from "supertest";

import { App } from "../app";
import { PortalModule } from '../modules';

import * as jwt from "jsonwebtoken";

describe("App", () => {

  describe("Views Tests", () => {

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
     clearDb("dev5001", done);
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

   it("should login an user", (done) => {
     process.env.API_PORT = "" + 3802;
     process.env.MONGO_DATABASE = "dev5001";
     appOneInstance = new App();
     appOneInstance.start().then(() => {
       request = supertest(PortalModule.expressApp);
       const userInfo = {
         login: "logmeiamanuser",
         name: "Some USer Tobeloged",
         password: "logonsecret123",
         password_confirmation: "logonsecret123",
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
              const tokenParsed: any = jwt.decode(responseTwo.body.token);
              expect(tokenParsed.id).toBeGreaterThan(1);
              expect(tokenParsed.uId).toEqual(response.body.userId);
              expect(tokenParsed.exp).toBeNumber();
              expect(tokenParsed.dId).toEqual(loginInfo.deviceId);
              expect(tokenParsed.dTp).toEqual(loginInfo.deviceType);
              expect(tokenParsed.perm).toBeDefined();
              appOneInstance.stop().then(done);
            });
         });
     });
   });

  });

});
