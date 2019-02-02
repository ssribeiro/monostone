import { IRule } from "../interfaces";

export function loadRule(ruleSheet: IRule): IRule {
  return {...ruleSheet};
}
