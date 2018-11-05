import "jasmine";
import "jasmine-expect";

import { EventController } from "./event_controller";
import { features as basicFeatures } from "./features";
import { ICommand } from "./interfaces";
import { connectStore } from "./store";
import { EventTools } from "./tools";

describe("EventController", () => {

  it("should be created", () => {
    const eventController: EventController = new EventController();
    expect(eventController).toBeDefined();
  });

  it("should load reducers", () => {
    const eventController: EventController = new EventController();
    eventController.loadReducers(basicFeatures());
    expect(EventController).toBeDefined();
  });

  it("should start reducer and stop gracefully", (done) => {
    const eventController: EventController = new EventController();
    eventController.loadReducers(basicFeatures());
    connectStore().then(() => {
      eventController.start();
      eventController.completePastReducing().then(() => {
        eventController.stop().then(done);
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
        const eventController: EventController = new EventController();
        eventController.loadReducers(basicFeatures());
        connectStore().then(() => {
          eventController.start();
          eventController.completePastReducing().then(() => {
            eventController.stop().then(done);
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
    const eventController: EventController = new EventController();
    eventController.loadReducers(basicFeatures());
    connectStore().then(() => {
      eventController.start();
      eventController.completePastReducing().then(() => {
        EventTools.send({ command, request }).then(() => {
          setTimeout(() => {
            eventController.stop().then(done);
          }, 150);
        });
      });
    });
  });

});
