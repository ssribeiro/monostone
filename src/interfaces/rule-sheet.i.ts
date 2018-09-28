export interface IRuleSheet {
  preValidation?: (req: any) => Promise<string>;
}
