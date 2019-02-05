import "jasmine";
import "jasmine-expect";

import { EventController } from "./event_controller";
import { ReducerController } from "./reducer_controller";
import { features as basicFeatures } from "./features/optional.index";
import { ICommand } from "./interfaces";
import { connectStore } from "./store";
import { EventTools, FeatureTools } from "./tools";

describe("ReducerController", () => {

  it("should load reducers", () => {
    const reducerController: ReducerController = new ReducerController();
    reducerController.loadFeatures( FeatureTools.createFeatures( basicFeatures ) );
    expect(ReducerController).toBeDefined();
  });

  it("should start reducer and stop gracefully", (done) => {
    let eventController: EventController | undefined = new EventController();
    const reducerController: ReducerController = new ReducerController();
    reducerController.loadFeatures( FeatureTools.createFeatures( basicFeatures ) );
    connectStore().then(() => {
      if(eventController) eventController.start().then(()=>{
        reducerController.start().then(() => {
          reducerController.stop().then(() => {
            if(eventController) eventController.stop().then(() => {
              eventController = undefined;
              done();
            });
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
        let eventController: EventController | undefined = new EventController();
        const reducerController: ReducerController = new ReducerController();
        reducerController.loadFeatures( FeatureTools.createFeatures( basicFeatures ) );
        connectStore().then(() => {
          if(eventController) eventController.start().then(() => {
            reducerController.start().then(() => {
              reducerController.stop().then(() => {
                if(eventController) eventController.stop().then(() => {
                  eventController = undefined;
                  done();
                });
              });
            });
          });
        });
      }, 150);
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
    let eventController: EventController | undefined = new EventController();
    const reducerController: ReducerController = new ReducerController();
    reducerController.loadFeatures(FeatureTools.createFeatures(basicFeatures));
    connectStore().then(() => {
      if(eventController) eventController.start().then(() => {
        reducerController.start().then(() => {
          EventTools.send({ command, request }).then(() => {
            setTimeout(() => {
              reducerController.stop().then(() => {
                if(eventController) eventController.stop().then(() => {
                  eventController = undefined;
                  done();
                });
              });
            }, 10);
          });
        });
      });
    });
  });

});
