import "jasmine";
import "jasmine-expect";

import { ruleSheet } from "../features/auth/commands/signup/signup.rule";
import { ICommand } from "../interfaces";
import { CommandTools } from "../tools";

describe("CommandTools", () => {

  describe("createCommand function", () => {

    it("should create a Command with rules and a name", () => {
      const command: ICommand = CommandTools.createCommand({
        commandName: "signup",
        featureName: "auth",
        featurePath: __dirname + "/../features/auth",
      });
      expect(command).toBeDefined();
      expect(command.commandName).toEqual("signup");
      expect(command.rule).toBeDefined();
      expect(ruleSheet).toBeDefined();
      expect(ruleSheet.preValidation).toBeDefined();
      expect(command.rule).toEqual(ruleSheet);
      if (command.rule) {
        expect(command.rule.validation).toBeDefined();
        expect(command.rule.respond).toBeDefined();
      }
    });

  });

});
