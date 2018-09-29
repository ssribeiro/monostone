export interface IRuleSheet {
  preValidation?: (req: any) => Promise<string>;
  validation?: (req: any) => Promise<string>;
  respond?: (eventNumber: number, req: any) => Promise<any>;
}
