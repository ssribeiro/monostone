import "jasmine-expect";
import * as supertest from "supertest";

import { App } from "./app";
import { messages } from "./features/auth/signup/signup.messages";

describe("App", () => {

  describe("Server Restarted Tests", () => {

   let i: number = 1;
   let appRestarted: App;
   let request: supertest.SuperTest<supertest.Test>;
   // let originalTimeout: number;

   beforeEach((done) => {
     process.env.MONGO_DATABASE = "dev" + i;
     process.env.API_PORT = "" + (3003 + i);
     i++;
     appRestarted = new App();
     appRestarted.start().then(() => {
       request = supertest(appRestarted.portal.expressApp);
       done();
     });
   });

   afterEach((done) => {
      // jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
      appRestarted.stop().then(done);
    });

   beforeAll((done) => {
      appRestarted = new App();
      appRestarted.connectStore().then(() => {
        appRestarted.systemTools.dbDrop().then(() => {
          appRestarted.systemTools.eventClear().then(() => {
            appRestarted.stop().then(done);
          });
        });
      });
    });

   afterAll((done) => {
     appRestarted = new App();
     appRestarted.connectStore().then(() => {
       appRestarted.systemTools.dbDrop().then(() => {
         appRestarted.systemTools.eventClear().then(() => {
           appRestarted.stop().then(done);
         });
       });
     });
   });

   it("should signup an user and give us the id", (done) => {
     const userInfo = {
       login: "user_twodee_login",
       name: "user two",
       password: "secret1234",
       password_confirmation: "secret1234",
     };
     (request.post("/auth/signup") as supertest.Test)
       .send(userInfo)
       .expect(200)
       .then((response) => {
         // console.log(response);
         // console.log(response.text);
         // console.log(response.body);
         expect(response.body.userId).toBeNumber();
         expect(response.body.userId).toBeGreaterThan(1);
         done();
       });
    });

   it("should deny signup an user already signed", (done) => {
     const userInfo = {
       login: "twodee_login_deny",
       name: "user two",
       password: "secret1234",
       password_confirmation: "secret1234",
     };
     (request.post("/auth/signup") as supertest.Test)
       .send(userInfo)
       .expect(200)
       .then((response) => {
         // console.log(response);
         // console.log(response.text);
         // console.log(response.body);
         expect(response.body.userId).toBeNumber();
         expect(response.body.userId).toBeGreaterThan(1);
         appRestarted.stop().then(() => {
           appRestarted = new App();
           appRestarted.start().then(() => {
             request = supertest(appRestarted.portal.expressApp);
             (request.post("/auth/signup") as supertest.Test)
               .send(userInfo)
               .expect(400, messages.LOGIN_TAKEN, done);
           });
         });
       });
    });

   it("should signup second user and give us the id", (done) => {
      const userInfo = {
        login: "user_SECOND_login",
        name: "user Second",
        password: "secret1234",
        password_confirmation: "secret1234",
      };
      (request.post("/auth/signup") as supertest.Test)
        .send(userInfo)
        .expect(200)
        .then((response) => {
          // console.log(response);
          // console.log(response.text);
          // console.log(response.body);
          expect(response.body.userId).toBeNumber();
          expect(response.body.userId).toBeGreaterThan(1);
          done();
        });
     });

   it("should deny signup second user already signed", (done) => {
       const userInfo = {
         login: "user_twosecondo_login_deny",
         name: "user Secondo",
         password: "secret1234",
         password_confirmation: "secret1234",
       };
       (request.post("/auth/signup") as supertest.Test)
         .send(userInfo)
         .expect(200)
         .then((response) => {
           // console.log(response);
           // console.log(response.text);
           // console.log(response.body);
           expect(response.body.userId).toBeNumber();
           expect(response.body.userId).toBeGreaterThan(1);
           appRestarted.stop().then(() => {
             appRestarted = new App();
             request = supertest(appRestarted.portal.expressApp);
             appRestarted.start().then(() => {
               (request.post("/auth/signup") as supertest.Test)
                 .send(userInfo)
                 .expect(400, messages.LOGIN_TAKEN, done);
             });
           });
         });
      });

  });

});
