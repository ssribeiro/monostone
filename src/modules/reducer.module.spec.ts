import "jasmine";
import "jasmine-expect";

import { EventModule, ReducerModule } from "./";
import { features as basicFeatures } from "../features/optional.index";
import { ICommand } from "../interfaces";
import { connectStore } from "../store";
import { EventTools, FeatureTools } from "../tools";

describe("ReducerModule", () => {

  it("should load reducers", () => {
    EventModule.config();
    ReducerModule.config();
    ReducerModule.loadFeatures( FeatureTools.createFeatures( basicFeatures ) );
    expect(ReducerModule).toBeDefined();
  });

  it("should start reducer and stop gracefully", (done) => {
    // jasmine.DEFAULT_TIMEOUT_INTERVAL = 200;
    EventModule.config();
    ReducerModule.config();
    ReducerModule.loadFeatures( FeatureTools.createFeatures( basicFeatures ) );
    connectStore().then(() => {
      EventModule.start().then(()=>{
        ReducerModule.start().then(() => {
          ReducerModule.stop().then(() => {
            EventModule.stop().then(done);
          });
        });
      });
    });
  });

   it("should complete life cycle when an event exists", (done) => {
     const command: ICommand = {
       commandName: "signup",
       featureName: "auth",
     };
     const request = {
       login: "luannosilas",
       name: "Luan Nosi",
       password: "12345678",
       password_confirmation: "12345678",
     };
     EventTools.send({ command, request }).then(() => {
       setTimeout(() => {
         EventModule.config();
         ReducerModule.config();
         ReducerModule.loadFeatures( FeatureTools.createFeatures( basicFeatures ) );
         connectStore().then(() => {
           EventModule.start().then(() => {
             ReducerModule.start().then(() => {
               ReducerModule.stop().then(() => {
                 EventModule.stop().then(done);
               });
             });
           });
         });
       }, 50);
     });
   });

   it("should complete life cycle when an event appears", (done) => {
     const command: ICommand = {
       commandName: "signup",
       featureName: "auth",
     };
     const request = {
       login: "lethinciasindra",
       nome: "Lethincia Sindra",
       password: "12345678",
       password_confirmation: "12345678",
     };
     EventModule.config();
     ReducerModule.config();
     ReducerModule.loadFeatures(FeatureTools.createFeatures(basicFeatures));
     connectStore().then(() => {
       EventModule.start().then(() => {
         ReducerModule.start().then(() => {
           EventTools.send({ command, request }).then(() => {
             setTimeout(() => {
               ReducerModule.stop().then(() => {
                 EventModule.stop().then(done);
               });
             }, 150);
           });
         });
       });
     });
   });

});