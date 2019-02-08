import * as ast from "@angstone/node-util";

import "jasmine-expect";
import * as supertest from "supertest";

import { messages } from "../features/auth/messages";
import { testFakeEmail } from './test-fake-email'

import { config } from "../config";
import { App } from "../app";
import { PortalModule } from '../modules';

describe("App", () => {

  config()
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
     clearDb("dev4001", done);
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

   const password: string = "sameforall";
   const passwordConfirmation: string = password;
   const users: any[] = [
     {
       login: "johncarterview",
       name: "John Carter",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "mariaclarieview",
       name: "Marie clarie",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "powerguidoview",
       name: "Tow The Power Guido",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "furacao2000view",
       name: "Furacão de 2000",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "SupergasBrasview",
       name: "Super gás Bras",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "bolsomitoview",
       name: "Jair Bolsonaro",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "postedebostaview",
       name: "Fernando Malddad",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "jeje1234clearview",
       name: "JEricó Master c-lear",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "sabadodesolview",
       name: "Sábado D'Sol",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "saihtanahsview",
       name: "Lúcifer Satan",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "bangladeshview",
       name: "Bang A desh",
       password, password_confirmation: passwordConfirmation,
     },
   ];

   function signup_user(input: any , done: any) {
     (request.post("/auth/signup") as supertest.Test)
       .send(input)
       .expect(200)
       .then((response) => {
         ast.delay(100).then(()=>{
           testFakeEmail(response.body.userId, input.login).then((result) => {
             expect(result).toBeTrue();
             done();
           })
         })
       });
   }

   function testPublicView(done: any) {
     (request.get("/auth/userlist") as supertest.Test)
       .expect(200)
       .then((response) => {
         const userListGot = response.body;
         expect(userListGot).toBeArray();
         expect(userListGot).toBeArrayOfObjects();
         users.forEach((user) => {
           const userMustBeInside = userListGot.filter((userGot: any) => userGot.name === user.name);
           expect(userMustBeInside).toBeNonEmptyArray();
           expect(userMustBeInside.length).toEqual(1);
           expect(userMustBeInside[0].role).toEqual("newuser");
           expect(userMustBeInside[0].memberSince).toBeNumber();
           expect(userMustBeInside[0].memberSince).toBeGreaterThan(10);
         });
         done();
       });
   }

   it("should render public view", (done) => {
     process.env.API_PORT = "" + 0;
     process.env.MONGO_DATABASE = "dev4001";
     appOneInstance = new App();
     appOneInstance.start().then(() => {
       request = supertest(PortalModule.getExpressApp());
       const dones: boolean[] = [];
       for (let i = 0; i < users.length; i++) {
         dones[i] = false;
       }
       for (let j = 0; j < users.length; j++) {
         signup_user(users[j], () => {
           dones[j] = true;
         });
       }

       const checkDone = (): boolean => {
         for (const k of dones) {
           if (!k) {
             return false;
           }
         }
         return true;
       };

       const atEnd = (ready: any) => {
         if (!checkDone()) {
           ast.delay(100).then(() => {
             atEnd(ready);
           });
         } else {
           ready();
         }
       };

       atEnd(() => {
         testPublicView(() => {
           appOneInstance.stop().then(done);
         });
       });
     });
   });

   it("should ask for token when try to access private view", (done) => {
     process.env.API_PORT = "" + 0;
     process.env.MONGO_DATABASE = "dev4001";
     appOneInstance = new App();
     appOneInstance.start().then(() => {
       request = supertest(PortalModule.getExpressApp());
       (request.get("/auth/session") as supertest.Test)
         .expect(401, messages.NO_TOKEN_PROVIDED)
         .then(() => {
           appOneInstance.stop().then(done);
         });
     });
   });

   it("should render private view", (done) => {
     process.env.API_PORT = "" + 0;
     process.env.MONGO_DATABASE = "dev4001";
     appOneInstance = new App();
     appOneInstance.start().then(() => {
       request = supertest(PortalModule.getExpressApp());
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
           ast.delay(100).then(()=>{
             testFakeEmail(response.body.userId, userInfo.login).then((result) => {
               expect(result).toBeTrue();

               (request.post("/auth/login") as supertest.Test)
                .send(loginInfo)
                .expect(200)
                .then((responseTwo) => {
                  expect(responseTwo.body).toBeDefined();
                  expect(responseTwo.body.token).toBeDefined();
                  expect(responseTwo.body.token).toBeString();
                  // request = supertest(PortalModule.getExpressApp());
                  (request.get("/auth/session") as supertest.Test)
                    .set("token", responseTwo.body.token)
                    .expect(200)
                    .then((responseThree) => {
                      expect(responseThree.body).toBeNonEmptyArray();
                      expect(responseThree.body.length).toEqual(1);
                      expect(responseThree.body[0].userId).toEqual(response.body.userId);
                      expect(responseThree.body[0].deviceType).toEqual(loginInfo.deviceType);
                      expect(responseThree.body[0].loggedSince).toBeNumber();
                      expect(responseThree.body[0].loggedSince).toBeGreaterThan(10);
                      expect(responseThree.body[0].loggedSince).toBeLessThan(Date.now());
                      appOneInstance.stop().then(done);
                    });
                });

             })
           });
         });
     });
   });

  });

});
