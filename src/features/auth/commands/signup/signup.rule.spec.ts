import "jasmine";
import "jasmine-expect";

import { messages } from "./signup.messages";
import { rule } from "./signup.rule";

describe("Signup Rule", () => {

  describe("preValidation logic and messages", () => {

    it("should have the preValidation rule", () => {
      expect(rule).toBeDefined();
      expect(rule.preValidation).toBeDefined();
    });

    it("should invalidate missing name", (done) => {
      if (rule.preValidation) {
        rule.preValidation({}).then((res) => {
          expect(res).toEqual(messages.NO_NAME);
          if (rule.preValidation) {
            rule.preValidation({ name: "" }).then((res2) => {
              expect(res2).toEqual(messages.NO_NAME);
              done();
            });
          }
        });
      }
    });

    it("should invalidate missing login", (done) => {
      if (rule.preValidation) {
        rule.preValidation({ name: "fulano" }).then((res) => {
          expect(res).toEqual(messages.NO_LOGIN);
          done();
        });
      }
    });

    it("should invalidate missing passord", (done) => {
      if (rule.preValidation) {
        rule.preValidation({
          login: "fulano",
          name: "fulano",
        }).then((res) => {
          expect(res).toEqual(messages.NO_PASSWORD);
          done();
        });
      }
    });

    it("should invalidate missing passord_confirmation", (done) => {
      if (rule.preValidation) {
        rule.preValidation(
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
      if (rule.preValidation) {
        rule.preValidation(
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
      if (rule.preValidation) {
        rule.preValidation(
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
      if (rule.preValidation) {
        rule.preValidation(
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
      if (rule.preValidation) {
        rule.preValidation(
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
      if (rule.preValidation) {
        rule.preValidation(
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
      expect(rule.validation).toBeDefined();
    });

  });

  describe("respond function", () => {

    it("should have a respond function", () => {
      expect(rule.respond).toBeDefined();
    });

  });

});
