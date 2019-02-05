import "jasmine";
import "jasmine-expect";

import { EventController } from "./event_controller";
import * as SystemCommands from "./system_commands";
import { EventTools } from "./tools";

describe("EventController", () => {

  beforeAll((done) => {
    EventTools.clearAllEvents().then(() => {
      EventTools.send({ command: SystemCommands.starting }).then(done);
    });
  });

  it("should be created", () => {
    const eventController: EventController = new EventController();
    expect(eventController).toBeDefined();
  });

});
