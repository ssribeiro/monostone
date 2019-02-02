import "jasmine";
import "jasmine-expect";

import { messages } from "./signup.messages";
import { ruleSheet } from "./signup.rule";

describe("Signup Rule", () => {

  describe("preValidation logic and messages", () => {

    it("should have the preValidation rule", () => {
      expect(ruleSheet).toBeDefined();
      expect(ruleSheet.preValidation).toBeDefined();
    });

    it("should invalidate missing name", (done) => {
      if (ruleSheet.preValidation) {
        ruleSheet.preValidation({}).then((res) => {
          expect(res).toEqual(messages.NO_NAME);
          if (ruleSheet.preValidation) {
            ruleSheet.preValidation({ name: "" }).then((res2) => {
              expect(res2).toEqual(messages.NO_NAME);
              done();
            });
          }
        });
      }
    });

    it("should invalidate missing login", (done) => {
      if (ruleSheet.preValidation) {
        ruleSheet.preValidation({ name: "fulano" }).then((res) => {
          expect(res).toEqual(messages.NO_LOGIN);
          done();
        });
      }
    });

    it("should invalidate missing passord", (done) => {
      if (ruleSheet.preValidation) {
        ruleSheet.preValidation({
          login: "fulano",
          name: "fulano",
        }).then((res) => {
          expect(res).toEqual(messages.NO_PASSWORD);
          done();
        });
      }
    });

    it("should invalidate missing passord_confirmation", (done) => {
      if (ruleSheet.preValidation) {
        ruleSheet.preValidation(
          {
            login: "fulano",
            name: "fulano",
            password: "secret",
          }).then((res) => {
          expect(res).toEqual(messages.NO_PASSWORD_CONFIRMATION);
          done();
        });
      }
    });

    it("should invalidate wrong name", (done) => {
      if (ruleSheet.preValidation) {
        ruleSheet.preValidation(
          {
            login: "fulano",
            name: "fulano",
            password: "secret",
            password_confirmation: "other",
          }).then((res) => {
          expect(res).toEqual(messages.WRONG_NAME);
          done();
        });
      }
    });

    it("should invalidate wrong login", (done) => {
      if (ruleSheet.preValidation) {
        ruleSheet.preValidation(
          {
            login: "fulan",
            name: "valid one",
            password: "secret",
            password_confirmation: "other",
          }).then((res) => {
          expect(res).toEqual(messages.WRONG_LOGIN);
          done();
        });
      }
    });

    it("should invalidate wrong passord", (done) => {
      if (ruleSheet.preValidation) {
        ruleSheet.preValidation(
          {
            login: "fulano",
            name: "valid one",
            password: "secret",
            password_confirmation: "other",
          }).then((res) => {
          expect(res).toEqual(messages.WRONG_PASSWORD);
          done();
        });
      }
    });

    it("should invalidate wrong passord_confirmation", (done) => {
      if (ruleSheet.preValidation) {
        ruleSheet.preValidation(
          {
            login: "fulano",
            name: "valid one",
            password: "secreto1",
            password_confirmation: "other",
          }).then((res) => {
          expect(res).toEqual(messages.WRONG_PASSWORD_CONFIRMATION);
          done();
        });
      }
    });

    it("should validate data", (done) => {
      if (ruleSheet.preValidation) {
        ruleSheet.preValidation(
          {
            login: "fulano",
            name: "valid one",
            password: "secreto1",
            password_confirmation: "secreto1",
          }).then((res) => {
          expect(res).toBeUndefined();
          done();
        });
      }
    });

  });

  describe("validation data", () => {

    it("should have a validation function", () => {
      expect(ruleSheet.validation).toBeDefined();
    });

  });

  describe("respond function", () => {

    it("should have a respond function", () => {
      expect(ruleSheet.respond).toBeDefined();
    });

  });

});
