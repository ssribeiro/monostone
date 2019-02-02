/**
 * reducer that takes events and apply changes on database
 */
export interface IReducer {
  /**
   * task process wich takes the request parameters and the event number
   */
  process: (req: any, eventNumber: number) => Promise<void>;
}

/**
 * check if the object is a reducer
 * @param  object 
 * @return boolean
 */
export function isIReducer(object: any): object is IReducer {
  return "process" in object;
}
