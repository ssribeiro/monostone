import "jasmine";
import "jasmine-expect";

import { EventModule } from "./";
import * as SystemCommands from "../system_commands";
import { EventTools } from "../tools";

describe("EventController", () => {

  beforeAll((done) => {
    EventTools.clearAllEvents().then(() => {
      EventTools.send({ command: SystemCommands.starting }).then(done);
    });
  });

  it("should be created", () => {
    EventModule.config();
    expect(EventModule).toBeDefined();
  });

});
