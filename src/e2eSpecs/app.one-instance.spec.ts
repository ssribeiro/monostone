import * as ast from "@angstone/node-util";

import "jasmine-expect";
import * as supertest from "supertest";

import { App } from "../app";
import { PortalModule } from '../modules';
import { messages } from "../features/auth/commands/signup/signup.messages";

describe("App", () => {

  describe("One Instance Running Tests", () => {

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
     clearDb("dev100", () => {
       clearDb("dev101", () => {
         clearDb("dev102", () => {
           clearDb("dev103", done);
         });
       });
     });
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

   it("should signup an user and give us the id", (done) => {
     process.env.API_PORT = "" + 0;
     process.env.MONGO_DATABASE = "dev100";
     appOneInstance = new App();
     appOneInstance.start().then(() => {
       request = supertest(PortalModule.expressApp);
       const userInfo = {
         login: "user_tworun_login",
         name: "user two",
         password: "secret1234",
         password_confirmation: "secret1234",
       };
       (request.post("/auth/signup") as supertest.Test)
       .send(userInfo)
       .expect(200)
       .then((response) => {
         expect(response.body.userId).toBeNumber();
         expect(response.body.userId).toBeGreaterThan(-1);
         appOneInstance.stop().then(done);
       });
     });
    });

   it("should deny signup an user already signed", (done) => {
     process.env.API_PORT = "" + 0;
     process.env.MONGO_DATABASE = "dev101";
     appOneInstance = new App();
     appOneInstance.start().then(() => {
       request = supertest(PortalModule.expressApp);
       const userInfo = {
         login: "Bixrun_deny",
         name: "user Bix",
         password: "secret1234",
         password_confirmation: "secret1234",
       };
       (request.post("/auth/signup") as supertest.Test)
       .send(userInfo)
       .expect(200)
       .then((response) => {
         expect(response.body.userId).toBeNumber();
         expect(response.body.userId).toBeGreaterThan(-1);
         (request.post("/auth/signup") as supertest.Test)
           .send(userInfo)
           .expect(400, messages.LOGIN_TAKEN, () => {
             appOneInstance.stop().then(done);
           });
       });
     });
    });

   it("should signup second user and give us the id", (done) => {
      process.env.API_PORT = "" + 0;
      process.env.MONGO_DATABASE = "dev101";
      appOneInstance = new App();
      appOneInstance.start().then(() => {
        request = supertest(PortalModule.expressApp);
        const userInfo = {
          login: "onerun_second_login",
          name: "One Run Second",
          password: "secret1234",
          password_confirmation: "secret1234",
        };
        (request.post("/auth/signup") as supertest.Test)
        .send(userInfo)
        .expect(200)
        .then((response) => {
          expect(response.body.userId).toBeNumber();
          expect(response.body.userId).toBeGreaterThan(-1);
          appOneInstance.stop().then(done);
        });
      });
     });

   it("should deny signup second user already signed", (done) => {
      process.env.API_PORT = "" + 0;
      process.env.MONGO_DATABASE = "dev101";
      appOneInstance = new App();
      appOneInstance.start().then(() => {
        request = supertest(PortalModule.expressApp);
        const userInfo = {
          login: "Second_Bixrun_deny",
          name: "user Bix",
          password: "secret1234",
          password_confirmation: "secret1234",
        };
        (request.post("/auth/signup") as supertest.Test)
        .send(userInfo)
        .expect(200)
        .then((response) => {
          expect(response.body.userId).toBeNumber();
          expect(response.body.userId).toBeGreaterThan(-1);
          (request.post("/auth/signup") as supertest.Test)
            .send(userInfo)
            .expect(400, messages.LOGIN_TAKEN, () => {
              appOneInstance.stop().then(done);
            });
        });
      });
     });

   const password: string = "sameforall";
   const passwordConfirmation: string = password;
   const users: any[] = [
     {
       login: "johncarter",
       name: "John Carter",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "mariaclarie",
       name: "Marie clarie",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "powerguido",
       name: "Tow The Power Guido",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "furacao2000",
       name: "Furacão de 2000",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "SupergasBras",
       name: "Super gás Bras",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "bolsomito",
       name: "Jair Bolsonaro",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "postedebosta",
       name: "Fernando Malddad",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "jeje1234clear",
       name: "JEricó Master c-lear",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "sabadodesol",
       name: "Sábado D'Sol",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "saihtanahs",
       name: "Lúcifer Satan",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "bangladesh",
       name: "Bang A desh",
       password, password_confirmation: passwordConfirmation,
     },
   ];

   const denyUsers: any[] = [
     {
       login: "johncarterdeny",
       name: "John Carter",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "mariaclariedeny",
       name: "Marie clarie",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "powerguidodeny",
       name: "Tow The Power Guido",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "furacao2000deny",
       name: "Furacão de 2000",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "SupergasBrasdeny",
       name: "Super gás Bras",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "bolsomitodeny",
       name: "Jair Bolsonaro",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "postedebostadeny",
       name: "Fernando Malddad",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "jeje1234cleardeny",
       name: "JEricó Master c-lear",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "sabadodesoldeny",
       name: "Sábado D'Sol",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "saihtanahsdeny",
       name: "Lúcifer Satan",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "bangladeshdeny",
       name: "Bang A desh",
       password, password_confirmation: passwordConfirmation,
     },
     // * test for load *
     {
       login: "bolsomitodenyload",
       name: "Jair Bolsonaro",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "postedebostadenyload",
       name: "Fernando Malddad",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "jeje1234cleardenyload",
       name: "JEricó Master c-lear",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "sabadodesoldenyload",
       name: "Sábado D'Sol",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "saihtanahsdenyload",
       name: "Lúcifer Satan",
       password, password_confirmation: passwordConfirmation,
     },
     {
       login: "bangladeshdenyload",
       name: "Bang A desh",
       password, password_confirmation: passwordConfirmation,
     },
   ];

   function deny_user(input: any, done: any) {
     (request.post("/auth/signup") as supertest.Test)
       .send(input)
       .expect(400, messages.LOGIN_TAKEN, done);
   }

   function signup_user(input: any , done: any) {
     (request.post("/auth/signup") as supertest.Test)
       .send(input)
       .expect(200)
       .then(done);
   }

   it("should signup MANY users", (done) => {
     process.env.API_PORT = "" + 0;
     process.env.MONGO_DATABASE = "dev102";
     appOneInstance = new App();
     appOneInstance.start().then(() => {
       request = supertest(PortalModule.expressApp);
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
           ast.delay(10).then(() => {
             atEnd(ready);
           });
         } else {
           ready();
         }
       };

       atEnd(() => {
         appOneInstance.stop().then(done);
       });
     });
   });

   it("should deny MANY users", (done) => {
     process.env.API_PORT = "" + 0;
     process.env.MONGO_DATABASE = "dev103";
     appOneInstance = new App();
     appOneInstance.start().then(() => {
       request = supertest(PortalModule.expressApp);
       const dones: boolean[] = [];
       for (let i = 0; i < denyUsers.length; i++) {
         dones[i] = false;
       }
       for (let j = 0; j < denyUsers.length; j++) {
         signup_user(denyUsers[j], () => {
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
           ast.delay(10).then(() => {
             atEnd(ready);
           });
         } else {
           ready();
         }
       };

       const nowDeny = () => {
         const denys: boolean[] = [];
         for (let i = 0; i < denyUsers.length; i++) {
           denys[i] = false;
         }
         for (let j = 0; j < denyUsers.length; j++) {
           deny_user(denyUsers[j], () => {
             denys[j] = true;
           });
         }

         const checkDeny = (): boolean => {
           for (const k of denys) {
             if (!k) {
               return false;
             }
           }
           return true;
         };

         const atEndDeny = (ready: any) => {
           if (!checkDeny()) {
             ast.delay(10).then(() => {
               atEndDeny(ready);
             });
           } else {
             ready();
           }
         };

         atEndDeny(() => {
           appOneInstance.stop().then(done);
         });
       };

       atEnd(nowDeny);
     });
   });

  });

});
