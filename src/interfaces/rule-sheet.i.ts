export interface IRuleSheet {
  preValidation?: (req: any) => Promise<string|undefined>;
  validation?: (req: any) => Promise<string|undefined|{req: any}>;
  respond?: (eventNumber: number, req: any) => Promise<any>;
}
