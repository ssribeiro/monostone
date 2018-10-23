import "jasmine";
import "jasmine-expect";
import { ICommand } from "../../interfaces";
import { feature } from "./";

describe("Auth Feature", () => {

  it("should be a feature", () => {
    expect(feature).toBeDefined();
  });

  it("should contain commands", () => {
    expect(feature.commands).toBeArray();
    if (feature.commands) {
      feature.commands.forEach((command: ICommand) => {
        expect(command.commandName).toBeString();
      });
    }
  });

});
