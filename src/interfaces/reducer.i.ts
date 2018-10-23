export interface IReducer {
  process: (req: any, eventNumber: number) => Promise<void>;
}

export function isIReducer(object: any): object is IReducer {
  return "process" in object;
}
