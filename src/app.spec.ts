import "jasmine-expect";
import * as supertest from "supertest";

import { App } from "./app";
import { features as basicFeatures } from "./features";
import { messages } from "./features/auth/signup/signup.messages";

describe("App", () => {

  describe("Wiped Tests", () => {

    // let originalTimeout: number;
    let app: App;
    let request: supertest.SuperTest<supertest.Test>;

    beforeEach((done) => {
      // originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      // jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
      app = new App();
      app.connectStore().then(() => {
        app.systemTools.dbDrop().then(() => {
          app.systemTools.eventClear().then(() => {
            app.start().then(() => {
              request = supertest(app.portal.expressApp);
              done();
            });
          });
        });
      });
    });

    afterEach((done) => {
       // jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
       app.stop().then(done);
     });

    afterAll((done) => {
      app = new App();
      app.connectStore().then(() => {
        app.systemTools.dbDrop().then(() => {
          app.systemTools.eventClear().then(() => {
            app.stop().then(done);
          });
        });
      });
    });

    it("should load the apiPort", () => {
      if (process.env.API_PORT) {
        expect(app.portal.apiPort).toBe(+process.env.API_PORT);
      } else {
        expect(app.portal.apiPort).toBe(3002);
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
        expect(app.features).toEqual(basicFeatures());
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
          expect(response.body.eventNumber).toBeNumber();
          expect(response.body.eventNumber).toBeGreaterThan(-1);
          done();
        });
    });

  });

  describe("Server Restarted Tests", () => {

   let app: App;
   let request: supertest.SuperTest<supertest.Test>;
   // let originalTimeout: number;

   beforeEach((done) => {
     app = new App();
     app.start().then(() => {
       request = supertest(app.portal.expressApp);
       done();
     });
   });

   afterEach((done) => {
      // jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
      app.stop().then(done);
    });

   afterAll((done) => {
     app = new App();
     app.connectStore().then(() => {
       app.systemTools.dbDrop().then(() => {
         app.systemTools.eventClear().then(() => {
           app.stop().then(done);
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
          expect(response.body.eventNumber).toBeNumber();
          expect(response.body.eventNumber).toBeGreaterThan(-1);
          done();
        });
    });

   it("should deny signup an user already signed", (done) => {
      const userInfo = {
        login: "user_twodee_login",
        name: "User Name Two Boy",
        password: "secreto1234",
        password_confirmation: "secreto1234",
      };
      (request.post("/auth/signup") as supertest.Test)
        .send(userInfo)
        .expect(400, messages.LOGIN_TAKEN, done);
    });

   it("should signup a second user and give us the id", (done) => {
       const userInfo = {
         login: "threedee_login",
         name: "user Three",
         password: "secret1234",
         password_confirmation: "secret1234",
       };
       (request.post("/auth/signup") as supertest.Test)
         .send(userInfo)
         .expect(200)
         .then((response) => {
           expect(response.body.eventNumber).toBeNumber();
           expect(response.body.eventNumber).toBeGreaterThan(-1);
           done();
         });
     });

   it("should deny signup the second user already signed", (done) => {
      const userInfo = {
        login: "threedee_login",
        name: "Name Only User",
        password: "secreta1234",
        password_confirmation: "secreta1234",
      };
      (request.post("/auth/signup") as supertest.Test)
        .send(userInfo)
        .expect(400, messages.LOGIN_TAKEN, done);
    });

  });

  describe("One Instance Running Tests", () => {

   let app: App;
   let request: supertest.SuperTest<supertest.Test>;
   // let originalTimeout: number;

   beforeAll((done) => {
     app = new App();
     app.start().then(() => {
       request = supertest(app.portal.expressApp);
       done();
     });
   });

   afterAll((done) => {
     app.systemTools.dbDrop().then(() => {
       app.systemTools.eventClear().then(() => {
         app.stop().then(done);
       });
     });
   });

   it("should signup an user and give us the id", (done) => {
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
          expect(response.body.eventNumber).toBeNumber();
          expect(response.body.eventNumber).toBeGreaterThan(-1);
          done();
        });
    });

   it("should deny signup an user already signed", (done) => {
      const userInfo = {
        login: "user_tworun_login",
        name: "user name two",
        password: "secreto1234",
        password_confirmation: "secreto1234",
      };
      (request.post("/auth/signup") as supertest.Test)
        .send(userInfo)
        .expect(400, messages.LOGIN_TAKEN, done);
    });

   it("should signup a second user and give us the id", (done) => {
       const userInfo = {
         login: "user_threerun_login",
         name: "user Three",
         password: "secret1234",
         password_confirmation: "secret1234",
       };
       (request.post("/auth/signup") as supertest.Test)
         .send(userInfo)
         .expect(200)
         .then((response) => {
           expect(response.body.eventNumber).toBeNumber();
           expect(response.body.eventNumber).toBeGreaterThan(-1);
           done();
         });
     });

   it("should deny signup the second user already signed", (done) => {
      const userInfo = {
        login: "user_threerun_login",
        name: "user name any",
        password: "secreta1234",
        password_confirmation: "secreta1234",
      };
      (request.post("/auth/signup") as supertest.Test)
        .send(userInfo)
        .expect(400, messages.LOGIN_TAKEN, done);
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

   function signup_users(input: any) {
    it("should signup MANY users", (done) => {
      (request.post("/auth/signup") as supertest.Test)
        .send(input)
        .expect(200)
        .then((response) => {
          done();
        });
    });
   }

   function deny_users(input: any) {
    it("should signup MANY users", (done) => {
      (request.post("/auth/signup") as supertest.Test)
        .send(input)
        .expect(400, messages.LOGIN_TAKEN, done);
    });
   }

   for (const user of users) {
     signup_users(user);
   }

   for (const user of users) {
     deny_users(user);
   }

  });

});
