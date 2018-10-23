import { error } from "../error";
import { IReducer } from "../interfaces";
import { isIReducer } from "../interfaces/reducer.i";

export function loadReducer(reducerRecipe: {
  featurePath: string,
  commandName: string,
}): IReducer {
  let reducer;
  try {
    reducer = require(reducerRecipe.featurePath + "/" +
      reducerRecipe.commandName + "/" +
      reducerRecipe.commandName + ".reducer").reducer;
  } catch (e) {
    error.fatal("failed to load reducer for command " +
      reducerRecipe.commandName);
  }
  if (!isIReducer(reducer)) { error.fatal("incorrect load of reducer for command "
    + reducerRecipe.commandName); }
  return reducer;
}
