import "jasmine-expect";
import * as supertest from "supertest";
import * as ast from "@angstone/node-util";

import { App } from "../app";
import { PortalModule } from '../modules';
import { messages } from "../features/auth/commands/signup/signup.messages";
import { testFakeEmail } from './test-fake-email'

describe("App", () => {

  describe("Server Restarted Tests", () => {

   let i: number = 1;
   let appRestarted: App;
   let request: supertest.SuperTest<supertest.Test>;
   // let originalTimeout: number;

   beforeEach((done) => {
     // jasmine.DEFAULT_TIMEOUT_INTERVAL = 2000;
     process.env.MONGO_DATABASE = "dev" + i;
     process.env.API_PORT = "" + 0;
     i++;
     appRestarted = new App();
     appRestarted.start().then(() => {
       request = supertest(PortalModule.getExpressApp());
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
         ast.delay(100).then(()=>{
           testFakeEmail(response.body.userId, userInfo.login).then((result) => {
             expect(result).toBeTrue();
             done();
           })
         })
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
             request = supertest(PortalModule.getExpressApp());
             (request.post("/auth/signup") as supertest.Test)
               .send(userInfo)
               .expect(400, messages.LOGIN_TAKEN, () => {
                 ast.delay(100).then(()=>{
                   testFakeEmail(response.body.userId, userInfo.login).then((result) => {
                     expect(result).toBeTrue();
                     done();
                   })
                 })
               });
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
          ast.delay(100).then(()=>{
            testFakeEmail(response.body.userId, userInfo.login).then((result) => {
              expect(result).toBeTrue();
              done();
            })
          })
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
             request = supertest(PortalModule.getExpressApp());
             appRestarted.start().then(() => {
               (request.post("/auth/signup") as supertest.Test)
                 .send(userInfo)
                 .expect(400, messages.LOGIN_TAKEN, () => {
                   ast.delay(100).then(()=>{
                     testFakeEmail(response.body.userId, userInfo.login).then((result) => {
                       expect(result).toBeTrue();
                       done();
                     })
                   })
                 });
             });
           });
         });
      });
      // jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;

  });

});
