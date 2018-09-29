import { IRuleSheet } from "../interfaces";

export function loadRule(ruleSheet: IRuleSheet): IRuleSheet {
  return {...ruleSheet};
}
